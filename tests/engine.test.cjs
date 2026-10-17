'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The browser's ESM engine can be exercised without a browser or real network traffic.
const source = fs.readFileSync(path.join(__dirname, '..', 'main-files', 'speedtest.js'), 'utf8');
const enginePromise = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('latency probes use uncached GET and count failed HTTP samples', async () => {
  const engine = await enginePromise;
  const previousFetch = global.fetch;
  let requests = 0;
  global.fetch = async (_url, init) => {
    requests += 1;
    assert.equal(init.method, 'GET');
    assert.equal(init.cache, 'no-store');
    return { ok: requests > 2, status: requests > 2 ? 200 : 503 };
  };
  try {
    const result = await engine.runPingTest('local', () => {});
    assert.equal(requests, 10);
    assert.equal(result.packetLoss, 20);
    assert.ok(Number.isFinite(result.ping));
    assert.ok(Number.isFinite(result.jitter));
  } finally {
    global.fetch = previousFetch;
  }
});

test('failed upload status is not reported as a measured speed', async () => {
  const engine = await enginePromise;
  const previousFetch = global.fetch;
  global.fetch = async (_url, init) => {
    assert.equal(init.method, 'POST');
    assert.equal(init.mode, 'cors');
    assert.equal(init.body.size, 5 * 1024 * 1024);
    return { ok: false, status: 429 };
  };
  try {
    await assert.rejects(engine.runUploadTest('local', () => {}), /Upload failed: HTTP 429/);
  } finally {
    global.fetch = previousFetch;
  }
});

test('cancelled download propagates AbortError', async () => {
  const engine = await enginePromise;
  const previousFetch = global.fetch;
  global.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), { once: true });
  });
  try {
    const result = engine.runDownloadTest('local', () => {});
    engine.abortTest();
    await assert.rejects(result, { name: 'AbortError' });
  } finally {
    global.fetch = previousFetch;
  }
});
