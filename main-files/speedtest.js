/**
 * SpeedPulse - Speed Test Engine
 * Handles Ping, Download, and Upload testing logic.
 */
const ENDPOINTS = {
    local: {
        down: '/api/down',
        up: '/api/up'
    },
    cloudflare: {
        down: 'https://speed.cloudflare.com/__down',
        up: 'https://speed.cloudflare.com/__up'
    }
};
let controller = null;
export function abortTest() {
    if (controller) {
        controller.abort();
        controller = null;
    }
}
// 1. Ping Test
export async function runPingTest(server = 'cloudflare', onProgress) {
    controller = new AbortController();
    const target = ENDPOINTS[server].down;
    const iterations = 10;
    const pings = [];
    let failed = 0;
    for (let i = 0; i < iterations; i++) {
        if (controller.signal.aborted) throw new DOMException("Speed test cancelled", "AbortError");
        const start = performance.now();
        try {
            // Cache buster to avoid cached responses
            const response = await fetch(`${target}?bytes=0&cb=${Date.now()}_${i}`, {
                method: "GET",
                signal: controller.signal,
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status} during latency probe`);
        const duration = performance.now() - start;
            pings.push(duration);
            onProgress(duration);
        }
        catch (e) {
            if (e.name === "AbortError") throw e;
            failed++;
        }
    }
    if (pings.length === 0)
        throw new Error("Ping test failed completely");
    const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
    // Calculate jitter (average of absolute differences between consecutive pings)
    let jitterSum = 0;
    for (let i = 1; i < pings.length; i++) {
        jitterSum += Math.abs(pings[i] - pings[i - 1]);
    }
    const jitter = pings.length > 1 ? jitterSum / (pings.length - 1) : 0;
    const packetLoss = (failed / iterations) * 100;
    return { ping: avgPing, jitter, packetLoss };
}
// 2. Download Test
export async function runDownloadTest(server = 'cloudflare', onProgress, bytes = 25 * 1024 * 1024) {
    controller = new AbortController();
    const target = ENDPOINTS[server].down;
    // Request 25MB chunk
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > 64 * 1024 * 1024) {
      throw new RangeError('Invalid download payload size');
    }
    const bytesToDownload = bytes;
    const url = `${target}?bytes=${bytesToDownload}&cb=${Date.now()}`;
    const startTime = performance.now();
    let loadedBytes = 0;
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok)
            throw new Error("Network response was not ok");
        if (!response.body) throw new Error('Streaming download unavailable');
    const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            loadedBytes += value.length;
            const now = performance.now();
            const durationSec = (now - startTime) / 1000;
            // Calculate Mbps
            if (durationSec > 0.1) {
                const mbps = (loadedBytes * 8) / 1e6 / durationSec;
                onProgress(mbps);
            }
        }
    }
    catch (e) {
        throw e;
    }
    const totalDurationSec = (performance.now() - startTime) / 1000;
    return totalDurationSec > 0 ? (loadedBytes * 8) / 1e6 / totalDurationSec : 0;
}
// 3. Upload Test
export async function runUploadTest(server = 'cloudflare', onProgress, bytes = 5 * 1024 * 1024) {
    controller = new AbortController();
    const target = ENDPOINTS[server].up;
    // Fetch doesn't expose upload byte progress. Report only a completed, checked result.
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > 8 * 1024 * 1024) {
      throw new RangeError('Invalid upload payload size');
    }
    const payloadSize = bytes;
    const buffer = new Uint8Array(payloadSize);
    for (let i = 0; i < payloadSize; i++) buffer[i] = Math.random() * 255;
    const start = performance.now();
    // Cloudflare's upload API expects a bytes parameter; the local server ignores it.
    const uploadUrl = server === 'cloudflare' ? target + '?bytes=' + payloadSize : target;
    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: new Blob([buffer], { type: 'text/plain' }),
        mode: 'cors',
        signal: controller.signal
    });
    if (!response.ok) throw new Error(`Upload failed: HTTP ${response.status}`);
    const durationSec = (performance.now() - start) / 1000;
    const measuredMbps = durationSec > 0 ? (payloadSize * 8) / 1e6 / durationSec : 0;
    onProgress(measuredMbps);
    return measuredMbps;
}
