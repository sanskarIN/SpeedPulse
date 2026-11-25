'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '..', 'src', 'speedtest.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
}).outputText;
const enginePromise = import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

// Unlike mocked fetch tests, this fixture uses real HTTP request/response bodies.
// It never connects to a public measurement endpoint or measures ISP bandwidth.
test('measurement engine against a real loopback HTTP transport', { timeout: 15000 }, async t => {
  const engine = await enginePromise;
  const nativeFetch = global.fetch;
  const payloadBytes = 8192;
  let mode = 'exact';
  let uploaded = 0;
  let probes = 0;
  let notifyStall;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      res.setHeader('Cache-Control', 'no-store');
      if (url.pathname === '/api/down') {
        if (url.searchParams.get('bytes') === '0') {
          probes++;
          res.statusCode = probes <= 2 ? 503 : 200;
          return res.end();
        }
        if (mode === 'rate-limit') {
          res.statusCode = 429;
          return res.end();
        }
        if (mode === 'stall') {
          res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
          res.write(Buffer.alloc(128));
          notifyStall?.();
          return; // client cancellation closes this deliberately unfinished response
        }
        const total = mode === 'short' ? payloadBytes - 1
          : mode === 'excess' ? payloadBytes + 1 : payloadBytes;
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.write(Buffer.alloc(1024, 17));
        return res.end(Buffer.alloc(total - 1024, 23));
      }
      if (url.pathname === '/api/up' && req.method === 'POST') {
        uploaded = 0;
        for await (const chunk of req) uploaded += chunk.length;
        if (mode === 'rate-limit') {
          res.statusCode = 429;
          return res.end();
        }
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ bytesReceived: uploaded }));
      }
      res.statusCode = 404;
      res.end();
    } catch {
      res.destroy();
    }
  });
  // Bind to an ephemeral port on loopback only.
  server.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const origin = 'http://127.0.0.1:' + server.address().port;
    global.fetch = (url, init) => {
      // Node fetch needs an absolute URL; browsers resolve same-origin paths.
      assert.match(String(url), /^\/api\/(down|up)(\?|$)/);
      return nativeFetch(new URL(url, origin), init);
    };

    await t.test('ten real HTTP latency probes retain the failed-probe percentage', async () => {
      const result = await engine.runPingTest('local', () => {}, 3000);
      assert.equal(probes, 10);
      assert.equal(result.packetLoss, 20);
      assert.ok(Number.isFinite(result.ping) && result.ping >= 0);
      assert.ok(Number.isFinite(result.jitter) && result.jitter >= 0);
    });

    await t.test('exact download completes with valid progress', async () => {
      mode = 'exact';
      const fractions = [];
      const mbps = await engine.runDownloadTest('local',
        (speed, fraction) => {
          assert.ok(Number.isFinite(speed) && speed >= 0);
          fractions.push(fraction);
        }, payloadBytes, 3000);
      assert.ok(Number.isFinite(mbps) && mbps >= 0);
      assert.equal(fractions.at(-1), 1);
      assert.ok(fractions.every(f => f >= 0 && f <= 1));
    });

    await t.test('short and excessive bodies cannot produce final speeds', async () => {
      mode = 'short';
      await assert.rejects(engine.runDownloadTest('local', () => {}, payloadBytes, 3000),
        /Incomplete download/);
      mode = 'excess';
      // Compatible with both the pre-integration and early-overrun checks.
      await assert.rejects(engine.runDownloadTest('local', () => {}, payloadBytes, 3000),
        /Incomplete download|Download exceeded requested size/);
    });

    await t.test('real upload sends the selected byte count and receives acknowledgement', async () => {
      mode = 'exact';
      const mbps = await engine.runUploadTest('local', () => {}, payloadBytes, 3000);
      assert.equal(uploaded, payloadBytes);
      assert.ok(Number.isFinite(mbps) && mbps >= 0);
    });

    await t.test('HTTP rate limiting rejects both transfer stages', async () => {
      mode = 'rate-limit';
      await assert.rejects(engine.runDownloadTest('local', () => {}, payloadBytes, 3000), /HTTP 429/);
      await assert.rejects(engine.runUploadTest('local', () => {}, payloadBytes, 3000), /HTTP 429/);
    });

    await t.test('Stop rejects an in-flight HTTP stream and a subsequent test recovers', async () => {
      mode = 'stall';
      const started = new Promise(resolve => { notifyStall = resolve; });
      const download = engine.runDownloadTest('local', () => {}, payloadBytes, 3000);
      // Register rejection handling immediately so a failure cannot be unhandled.
      const rejected = assert.rejects(download, { name: 'AbortError' });
      try {
        // If the request never arrives, the engine deadline fails the assertion
        // rather than leaving a pending promise hanging until the suite timeout.
        await Promise.race([started, download]);
        engine.abortTest();
        await rejected;
      } finally {
        notifyStall = undefined;
        engine.abortTest();
        await rejected.catch(() => {});
      }
      mode = 'exact';
      assert.ok(Number.isFinite(await engine.runDownloadTest('local', () => {}, payloadBytes, 3000)));
    });
  } finally {
    engine.abortTest();
    global.fetch = nativeFetch;
    const closed = new Promise(resolve => server.close(resolve));
    server.closeAllConnections();
    await closed;
  }
});
