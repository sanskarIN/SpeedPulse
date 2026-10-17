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
export async function runPingTest(server = 'auto', onProgress) {
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
export async function runDownloadTest(server = 'auto', onProgress) {
    controller = new AbortController();
    const target = ENDPOINTS[server].down;
    // Request 25MB chunk
    const bytesToDownload = 25 * 1024 * 1024;
    const url = `${target}?bytes=${bytesToDownload}&cb=${Date.now()}`;
    const startTime = performance.now();
    let loadedBytes = 0;
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok)
            throw new Error("Network response was not ok");
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
                const mbps = (loadedBytes * 8) / (1024 * 1024) / durationSec;
                onProgress(mbps);
            }
        }
    }
    catch (e) {
        throw e;
    }
    const totalDurationSec = (performance.now() - startTime) / 1000;
    return totalDurationSec > 0 ? (loadedBytes * 8) / (1024 * 1024) / totalDurationSec : 0;
}
// 3. Upload Test
export async function runUploadTest(server = 'auto', onProgress) {
    controller = new AbortController();
    const target = ENDPOINTS[server].up;
    // Generate random 5MB payload
    const payloadSize = 5 * 1024 * 1024;
    const buffer = new Uint8Array(payloadSize);
    for (let i = 0; i < payloadSize; i++) {
        buffer[i] = Math.random() * 255;
    }
    const blob = new Blob([buffer], { type: 'text/plain' });
    return new Promise(async (resolve, reject) => {
        let startTime = performance.now();
        // Fake progress since fetch no-cors doesn't give us upload progress
        let fakeProgressTimer = setInterval(() => {
            const currentDuration = (performance.now() - startTime) / 1000;
            // Guess a speed
            const estimatedMbps = (payloadSize * 0.5 * 8) / (1024 * 1024) / currentDuration;
            onProgress(estimatedMbps > 0 ? estimatedMbps : 0);
        }, 500);
        try {
            // Using a simple POST with Blob of text/plain type
            // This prevents the browser from sending a CORS preflight OPTIONS request
            const response = await fetch(target, {
                method: 'POST',
                body: blob,
                mode: "cors",
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`Upload failed: HTTP ${response.status}`);
            clearInterval(fakeProgressTimer);
            const durationSec = (performance.now() - startTime) / 1000;
            const finalMbps = (payloadSize * 8) / (1024 * 1024) / durationSec;
            onProgress(finalMbps);
            resolve(finalMbps);
        }
        catch (e) {
            clearInterval(fakeProgressTimer);
            reject(e);
        }
    });
}
