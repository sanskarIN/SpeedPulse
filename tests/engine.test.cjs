'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The browser's ESM engine can be exercised without a browser or real network traffic.
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'speedtest.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
}).outputText;
const enginePromise = import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

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

test('Cloudflare upload includes the requested payload byte count', async () => {
  const engine = await enginePromise;
  const previousFetch = global.fetch;
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://speed.cloudflare.com/__up?bytes=5242880');
    assert.equal(init.method, 'POST');
    assert.equal(init.mode, 'cors');
    assert.equal(init.body.size, 5242880);
    return { ok: true, status: 200 };
  };
  try {
    const measured = await engine.runUploadTest('cloudflare', () => {});
    assert.ok(measured >= 0);
  } finally {
    global.fetch = previousFetch;
  }
});

test('self-hosted upload does not append Cloudflare-specific parameters', async () => {
  const engine = await enginePromise;
  const previousFetch = global.fetch;
  global.fetch = async (url) => {
    assert.equal(url, '/api/up');
    return { ok: true, status: 200 };
  };
  try {
    await engine.runUploadTest('local', () => {});
  } finally {
    global.fetch = previousFetch;
  }
});

test('shipped test flow presents upload failure inline without blocking alert', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'main-files', 'bundle.js'), 'utf8');
  assert.match(source, /Partial result: download and ping measured; upload unavailable/);
  assert.match(source, /uploadError/);
  assert.doesNotMatch(source, /alert\(['"]Test failed\. Please check your connection and try again/);
  assert.match(source, /sw\.js\?v=7\.0/);
});

test('bandwidth chart never calls the previously undefined latency function', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'script.ts'), 'utf8');
  const bundled = fs.readFileSync(path.join(__dirname, '..', 'main-files', 'bundle.js'), 'utf8');
  for (const code of [src, bundled]) {
    assert.doesNotMatch(code, /updateLatencyPoint\s*\(/);
    assert.match(code, /function addChartPoint\(/);
  }
});

test('quick upload honors the selected 1 MiB data budget', async () => {
  const engine = await enginePromise;
  const previousFetch = global.fetch;
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://speed.cloudflare.com/__up?bytes=1048576');
    assert.equal(init.body.size, 1048576);
    return { ok: true, status: 200 };
  };
  try {
    await engine.runUploadTest('cloudflare', () => {}, 1048576);
  } finally {
    global.fetch = previousFetch;
  }
});

test('invalid transfer budgets never initiate a request', async () => {
  const engine = await enginePromise;
  const previousFetch = global.fetch;
  global.fetch = () => { throw new Error('A transfer should not start'); };
  try {
    await assert.rejects(engine.runDownloadTest('local', () => {}, 0), RangeError);
    await assert.rejects(engine.runDownloadTest('local', () => {}, 80 * 1024 * 1024), RangeError);
    await assert.rejects(engine.runUploadTest('local', () => {}, 9 * 1024 * 1024), RangeError);
  } finally {
    global.fetch = previousFetch;
  }
});
