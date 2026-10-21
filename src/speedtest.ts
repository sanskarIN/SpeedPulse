/**
 * SpeedPulse browser measurement engine.
 * Browser requests have bounded deadlines, explicit cancellation and honest
 * HTTP-stage errors. Requests never silently fall back to mock measurements.
 */
export type SpeedServer = 'cloudflare' | 'local';
export type TestStage = 'ping' | 'download' | 'upload';
export type ProgressListener = (value: number) => void;
export interface PingResult {
    ping: number;
    jitter: number;
    packetLoss: number; // fraction of failed HTTP requests, not IP packet loss
}

export const MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const LATENCY_TIMEOUT_MS = 8_000; // each HTTP ping probe
export const DOWNLOAD_TIMEOUT_MS = 90_000;
export const UPLOAD_TIMEOUT_MS = 90_000;

const ENDPOINTS: Readonly<Record<SpeedServer, { down: string; up: string }>> = {
    local: { down: '/api/down', up: '/api/up' },
    cloudflare: {
        down: 'https://speed.cloudflare.com/__down',
        up: 'https://speed.cloudflare.com/__up',
    },
};

export class MeasurementTimeoutError extends Error {
    constructor(public readonly stage: TestStage, public readonly timeoutMs: number) {
        super(`${stage} exceeded its ${timeoutMs} ms deadline`);
        this.name = 'MeasurementTimeoutError';
    }
}

let activeController: AbortController | null = null;
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

function resolveServer(server: SpeedServer): SpeedServer {
    return server === 'local' && isFileProtocol ? 'cloudflare' : server;
}

function assertBytes(bytes: number, max: number): void {
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > max) {
        throw new RangeError(`Test payload must be between 1 and ${max} bytes`);
    }
}

function assertTimeout(ms: number, max: number): void {
    if (!Number.isSafeInteger(ms) || ms < 1 || ms > max) {
        throw new RangeError(`Request timeout must be between 1 and ${max} ms`);
    }
}

function cancelled(): DOMException {
    return new DOMException('Speed test cancelled', 'AbortError');
}

/**
 * Limits the entire network operation (including streaming body reads).
 * The promise rejects promptly on timeout or explicit Stop even if a browser
 * fetch mock or third-party transport fails to observe AbortSignal.
 */
function withDeadline<T>(
    stage: TestStage,
    timeoutMs: number,
    work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
    const request = new AbortController();
    activeController = request;
    return new Promise<T>((resolve, reject) => {
        let settled = false;
        let timedOut = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const cleanup = () => {
            if (timer !== undefined) clearTimeout(timer);
            request.signal.removeEventListener('abort', onAbort);
            if (activeController === request) activeController = null;
        };
        const finish = (success: boolean, value: T | unknown) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (success) resolve(value as T);
            else reject(value);
        };
        const onAbort = () => finish(false,
            timedOut ? new MeasurementTimeoutError(stage, timeoutMs) : cancelled());
        request.signal.addEventListener('abort', onAbort, { once: true });
        timer = setTimeout(() => {
            timedOut = true;
            request.abort();
        }, timeoutMs);
        try {
            work(request.signal).then(
                value => finish(true, value),
                error => finish(false, error),
            );
        } catch (error) {
            finish(false, error);
        }
    });
}

function safeProgress(onProgress: ProgressListener, value: number, signal: AbortSignal): void {
    if (signal.aborted) throw cancelled();
    try {
        onProgress(value);
    } catch (error) {
        // A missing chart or an optional UI widget must not cancel a valid test.
        console.warn('[SpeedPulse] Ignoring presentation callback error:', error);
    }
}

export function abortTest(): void {
    const current = activeController;
    activeController = null;
    current?.abort();
}

/** A concise explanation suitable for an inline error/status element. */
export function explainTestError(error: unknown, stage: TestStage, server: SpeedServer): string {
    if (error instanceof MeasurementTimeoutError) {
        return `${stage} timed out after ${Math.ceil(error.timeoutMs / 1000)} seconds. Try Quick mode or another endpoint.`;
    }
    if (error instanceof Error && error.name === 'AbortError') return 'Test cancelled.';
    const message = error instanceof Error ? error.message : '';
    if (/HTTP 429\b/.test(message)) return 'The test endpoint is rate-limiting requests (HTTP 429). Try again later.';
    if (/HTTP 413\b/.test(message)) return 'The selected payload exceeds the server limit (HTTP 413). Try Quick mode.';
    if (/HTTP 5\d\d\b/.test(message)) return `${stage} failed because the server returned an error. Try again later.`;
    if (error instanceof TypeError) return `${stage} could not reach the ${server === 'local' ? 'ASP.NET Core' : 'Cloudflare'} endpoint. Check connectivity or browser restrictions.`;
    return `${stage} could not be measured. Check the selected server and retry.`;
}

export async function runPingTest(
    selectedServer: SpeedServer = 'cloudflare',
    onProgress: ProgressListener = () => {},
    probeTimeoutMs: number = LATENCY_TIMEOUT_MS,
): Promise<PingResult> {
    assertTimeout(probeTimeoutMs, LATENCY_TIMEOUT_MS);
    const server = resolveServer(selectedServer);
    const target = ENDPOINTS[server].down;
    const iterations = 10;
    const readings: number[] = [];
    let failed = 0;

    for (let i = 0; i < iterations; i++) {
        try {
            const elapsed = await withDeadline('ping', probeTimeoutMs, async signal => {
                const start = performance.now();
                const response = await fetch(`${target}?bytes=0&cb=${Date.now()}_${i}`, {
                    method: 'GET',
                    signal,
                    cache: 'no-store',
                });
                if (!response.ok) throw new Error(`HTTP ${response.status} during latency probe`);
                const duration = performance.now() - start;
                safeProgress(onProgress, duration, signal);
                return duration;
            });
            readings.push(elapsed);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            // Timeout and HTTP failures count as failed application-layer probes.
            failed++;
        }
    }

    if (!readings.length) throw new Error('All latency probes failed');
    const ping = readings.reduce((a, b) => a + b, 0) / readings.length;
    let variation = 0;
    for (let i = 1; i < readings.length; i++) {
        variation += Math.abs(readings[i] - readings[i - 1]);
    }
    return {
        ping,
        jitter: readings.length > 1 ? variation / (readings.length - 1) : 0,
        packetLoss: failed / iterations * 100,
    };
}

export async function runDownloadTest(
    selectedServer: SpeedServer = 'cloudflare',
    onProgress: ProgressListener = () => {},
    bytes: number = 25 * 1024 * 1024,
    timeoutMs: number = DOWNLOAD_TIMEOUT_MS,
): Promise<number> {
    assertBytes(bytes, MAX_DOWNLOAD_BYTES);
    assertTimeout(timeoutMs, DOWNLOAD_TIMEOUT_MS);
    const server = resolveServer(selectedServer);
    const target = ENDPOINTS[server].down;

    return withDeadline('download', timeoutMs, async signal => {
        const start = performance.now();
        let received = 0;
        const response = await fetch(`${target}?bytes=${bytes}&cb=${Date.now()}`, {
            signal,
            cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
        if (!response.body) throw new Error('Streaming download unavailable');
        const reader = response.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (signal.aborted) throw cancelled();
                if (done) break;
                received += value.byteLength;
                const seconds = (performance.now() - start) / 1000;
                if (seconds > 0.1) safeProgress(onProgress, received * 8 / 1_000_000 / seconds, signal);
            }
        } finally {
            if (signal.aborted) {
                // Do not delay error propagation waiting on a stalled stream.
                void reader.cancel().catch(() => {});
            }
        }
        if (!received) throw new Error('Download returned no bytes');
        const seconds = (performance.now() - start) / 1000;
        const measured = seconds > 0 ? received * 8 / 1_000_000 / seconds : 0;
        safeProgress(onProgress, measured, signal);
        return measured;
    });
}

export async function runUploadTest(
    selectedServer: SpeedServer = 'cloudflare',
    onProgress: ProgressListener = () => {},
    bytes: number = 5 * 1024 * 1024,
    timeoutMs: number = UPLOAD_TIMEOUT_MS,
): Promise<number> {
    assertBytes(bytes, MAX_UPLOAD_BYTES);
    assertTimeout(timeoutMs, UPLOAD_TIMEOUT_MS);
    const server = resolveServer(selectedServer);
    const target = ENDPOINTS[server].up;
    const buffer = new Uint8Array(bytes);
    for (let i = 0; i < buffer.length; i++) buffer[i] = Math.random() * 256;
    const body = new Blob([buffer], { type: 'text/plain' });
    const uploadUrl = server === 'cloudflare' ? `${target}?bytes=${bytes}` : target;

    return withDeadline('upload', timeoutMs, async signal => {
        const start = performance.now();
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body,
            mode: 'cors',
            signal,
        });
        if (!response.ok) throw new Error(`Upload failed: HTTP ${response.status}`);
        const seconds = (performance.now() - start) / 1000;
        const measured = seconds > 0 ? bytes * 8 / 1_000_000 / seconds : 0;
        safeProgress(onProgress, measured, signal);
        return measured;
    });
}
