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

test('a stalled latency probe times out and is counted as failed HTTP sampling', async () => {
  const engine = await enginePromise;
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    if (calls === 1) return new Promise(() => {}); // ignores AbortSignal
    return { ok: true, status: 200 };
  };
  try {
    const result = await engine.runPingTest('local', () => {}, 10);
    assert.equal(calls, 10);
    assert.equal(result.packetLoss, 10);
    assert.ok(Number.isFinite(result.ping));
  } finally {
    global.fetch = original;
  }
});

test('a stalled download stream cannot hang a speed test indefinitely', async () => {
  const engine = await enginePromise;
  const original = global.fetch;
  global.fetch = async () => ({
    ok: true,
    body: { getReader: () => ({
      read: () => new Promise(() => {}), // deliberately non-cooperative reader
      cancel: async () => {},
    }) },
  });
  try {
    await assert.rejects(engine.runDownloadTest('local', () => {}, 1024, 20),
      error => error.name === 'MeasurementTimeoutError' && error.stage === 'download');
  } finally {
    global.fetch = original;
  }
});

test('a stalled upload times out even if fetch ignores the abort signal', async () => {
  const engine = await enginePromise;
  const original = global.fetch;
  global.fetch = () => new Promise(() => {});
  try {
    await assert.rejects(engine.runUploadTest('local', () => {}, 1024, 20),
      error => error.name === 'MeasurementTimeoutError' && error.stage === 'upload');
  } finally {
    global.fetch = original;
  }
});

test('Stop cancels a non-cooperative upload without waiting for its timeout', async () => {
  const engine = await enginePromise;
  const original = global.fetch;
  global.fetch = () => new Promise(() => {});
  try {
    const result = engine.runUploadTest('local', () => {}, 1024, 30_000);
    engine.abortTest();
    await assert.rejects(result, { name: 'AbortError' });
  } finally {
    global.fetch = original;
  }
});

test('optional chart callback failure does not invalidate a completed download', async () => {
  const engine = await enginePromise;
  const original = global.fetch;
  global.fetch = async () => {
    const bytes = new Uint8Array(512);
    let step = 0;
    return { ok: true, body: { getReader: () => ({
      read: async () => step++ === 0
        ? { done: false, value: bytes }
        : { done: true }
    }) } };
  };
  try {
    const measured = await engine.runDownloadTest('local', () => {
      throw new Error('Chart widget was removed');
    }, 512);
    assert.ok(Number.isFinite(measured) && measured > 0);
  } finally {
    global.fetch = original;
  }
});

test('inline errors explain timeout, rate limiting and oversize requests', async () => {
  const engine = await enginePromise;
  assert.match(engine.explainTestError(new engine.MeasurementTimeoutError('upload', 20),
    'upload', 'local'), /upload timed out/i);
  assert.match(engine.explainTestError(new Error('Upload failed: HTTP 429'),
    'upload', 'cloudflare'), /rate-limiting/i);
  assert.match(engine.explainTestError(new Error('Upload failed: HTTP 413'),
    'upload', 'local'), /server limit/i);
});

test('timeouts reject invalid configuration before any transfer starts', async () => {
  const engine = await enginePromise;
  const original = global.fetch;
  global.fetch = () => { throw new Error('Network should never be called'); };
  try {
    await assert.rejects(engine.runPingTest('local', () => {}, 0), RangeError);
    await assert.rejects(engine.runDownloadTest('local', () => {}, 1024, 200_000), RangeError);
    await assert.rejects(engine.runUploadTest('local', () => {}, 1024, 0), RangeError);
  } finally {
    global.fetch = original;
  }
});

test('a truncated HTTP download is rejected instead of reported as measured throughput', async () => {
  const engine = await enginePromise;
  const original = global.fetch;
  global.fetch = async () => {
    let step = 0;
    return { ok: true, body: { getReader: () => ({
      read: async () => step++ === 0
        ? { done: false, value: new Uint8Array(100) }
        : { done: true }
    }) } };
  };
  try {
    await assert.rejects(engine.runDownloadTest('local', () => {}, 1024), /Incomplete download/);
  } finally {
    global.fetch = original;
  }
});

test('download progress reflects actually received bytes and completes at 100 percent', async () => {
  const engine = await enginePromise;
  const original = global.fetch;
  global.fetch = async () => {
    let step = 0;
    return { ok: true, body: { getReader: () => ({
      read: async () => step++ === 0
        ? { done: false, value: new Uint8Array(1024) }
        : { done: true }
    }) } };
  };
  const fractions = [];
  try {
    const measured = await engine.runDownloadTest('local',
      (_mbps, completedFraction) => fractions.push(completedFraction), 1024);
    assert.ok(measured > 0);
    assert.ok(fractions.includes(1));
    assert.ok(fractions.every(f => f >= 0 && f <= 1));
  } finally {
    global.fetch = original;
  }
});

test('the dashboard source uses fractional downloaded bytes for its progress bar', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'src', 'script.ts'), 'utf8');
  assert.match(script, /completedFraction/);
  assert.match(script, /progDown\.style\.width/);
});
