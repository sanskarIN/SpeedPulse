/**
 * Browser speed-test engine. Transfer sizes are controlled by the selected
 * typed data budget; server-side ASP.NET limits are an independent safeguard.
 */
export type SpeedServer = 'cloudflare' | 'local';
export type ProgressListener = (mbps: number) => void;
export interface PingResult {
    ping: number;
    jitter: number;
    packetLoss: number; // failed HTTP probes, not actual IP packet loss
}

export const MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const ENDPOINTS: Readonly<Record<SpeedServer, { down: string; up: string }>> = {
    local: { down: '/api/down', up: '/api/up' },
    cloudflare: {
        down: 'https://speed.cloudflare.com/__down',
        up: 'https://speed.cloudflare.com/__up',
    },
};

let controller: AbortController | null = null;
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

function resolveServer(server: SpeedServer): SpeedServer {
    return server === 'local' && isFileProtocol ? 'cloudflare' : server;
}

function assertBytes(bytes: number, max: number): void {
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > max) {
        throw new RangeError(`Test payload must be between 1 and ${max} bytes`);
    }
}

export function abortTest(): void {
    controller?.abort();
    controller = null;
}

export async function runPingTest(
    selectedServer: SpeedServer = 'cloudflare',
    onProgress: ProgressListener = () => {},
): Promise<PingResult> {
    const server = resolveServer(selectedServer);
    const signal = (controller = new AbortController()).signal;
    const target = ENDPOINTS[server].down;
    const iterations = 10;
    const readings: number[] = [];
    let failed = 0;

    for (let i = 0; i < iterations; i++) {
        if (signal.aborted) throw new DOMException('Speed test cancelled', 'AbortError');
        const start = performance.now();
        try {
            const response = await fetch(`${target}?bytes=0&cb=${Date.now()}_${i}`, {
                method: 'GET',
                signal,
                cache: 'no-store',
            });
            if (!response.ok) throw new Error(`Latency probe returned HTTP ${response.status}`);
            const elapsed = performance.now() - start;
            readings.push(elapsed);
            onProgress(elapsed);
        } catch (error) {
            if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
            failed++;
        }
    }

    if (!readings.length) throw new Error('All latency probes failed');
    const ping = readings.reduce((a, b) => a + b, 0) / readings.length;
    let sum = 0;
    for (let i = 1; i < readings.length; i++) {
        sum += Math.abs(readings[i] - readings[i - 1]);
    }
    return {
        ping,
        jitter: readings.length > 1 ? sum / (readings.length - 1) : 0,
        packetLoss: failed / iterations * 100,
    };
}

export async function runDownloadTest(
    selectedServer: SpeedServer = 'cloudflare',
    onProgress: ProgressListener = () => {},
    bytes: number = 25 * 1024 * 1024,
): Promise<number> {
    assertBytes(bytes, MAX_DOWNLOAD_BYTES);
    const server = resolveServer(selectedServer);
    const signal = (controller = new AbortController()).signal;
    const target = ENDPOINTS[server].down;
    const start = performance.now();
    let received = 0;
    const response = await fetch(`${target}?bytes=${bytes}&cb=${Date.now()}`, {
        signal,
        cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Download returned HTTP ${response.status}`);
    if (!response.body) throw new Error('Streaming download is unavailable in this browser');
    const reader = response.body.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        const elapsed = (performance.now() - start) / 1000;
        if (elapsed > 0.1) onProgress(received * 8 / 1_000_000 / elapsed);
    }

    if (signal.aborted) throw new DOMException('Speed test cancelled', 'AbortError');
    if (!received) throw new Error('Download returned no bytes');
    const seconds = (performance.now() - start) / 1000;
    const measured = seconds > 0 ? received * 8 / 1_000_000 / seconds : 0;
    onProgress(measured);
    return measured;
}

export async function runUploadTest(
    selectedServer: SpeedServer = 'cloudflare',
    onProgress: ProgressListener = () => {},
    bytes: number = 5 * 1024 * 1024,
): Promise<number> {
    assertBytes(bytes, MAX_UPLOAD_BYTES);
    const server = resolveServer(selectedServer);
    const signal = (controller = new AbortController()).signal;
    const target = ENDPOINTS[server].up;
    const buffer = new Uint8Array(bytes);
    // Content entropy reduces opportunities for intermediary compression.
    for (let i = 0; i < buffer.length; i++) buffer[i] = Math.random() * 256;
    const body = new Blob([buffer], { type: 'text/plain' });
    const uploadUrl = server === 'cloudflare' ? `${target}?bytes=${bytes}` : target;
    const start = performance.now();
    const response = await fetch(uploadUrl, {
        method: 'POST',
        body,
        mode: 'cors',
        signal,
    });
    if (!response.ok) throw new Error(`Upload failed: HTTP ${response.status}`);
    if (signal.aborted) throw new DOMException('Speed test cancelled', 'AbortError');
    const seconds = (performance.now() - start) / 1000;
    const measured = seconds > 0 ? bytes * 8 / 1_000_000 / seconds : 0;
    onProgress(measured);
    return measured;
}
