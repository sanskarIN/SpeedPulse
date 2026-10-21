#!/usr/bin/env node
'use strict';

/**
 * SpeedPulse browser smoke test, dependency-free under Node 22.
 *
 * Runs the actual compiled dashboard against a local HTTP server in headless
 * Chrome. Only the public Cloudflare measurement endpoints are mocked: no
 * real benchmark traffic or uploaded user data leaves CI.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const site = path.resolve(__dirname, '..', 'main-files');
const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']
  .find(binary => spawnSync('which', [binary], { encoding: 'utf8' }).status === 0);
assert.ok(chrome, 'Headless Chrome/Chromium is required for browser smoke tests');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function until(callback, timeoutMs, label) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await callback();
    if (result) return result;
    await sleep(150);
  }
  throw new Error('Timed out waiting for ' + label);
}

function localServer() {
  const mime = {
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.png': 'image/png',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
  };
  return http.createServer((request, response) => {
    const decoded = decodeURIComponent((request.url || '/').split('?')[0]);
    const full = path.resolve(site, '.' + (decoded === '/' ? '/index.html' : decoded));
    if (!full.startsWith(site + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mime[path.extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(full).pipe(response);
  });
}

async function startChrome(profile) {
  const process = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--disable-dev-shm-usage', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank',
  ], { stdio: 'ignore' });
  const activePort = path.join(profile, 'DevToolsActivePort');
  const port = await until(() => {
    if (process.exitCode !== null) throw new Error('Headless Chrome exited during startup');
    if (!fs.existsSync(activePort)) return null;
    const port = Number(fs.readFileSync(activePort, 'utf8').split('\n')[0]);
    return Number.isInteger(port) && port > 0 ? port : null;
  }, 20_000, 'Chrome DevTools port');
  const targets = await until(async () => {
    const response = await fetch('http://127.0.0.1:' + port + '/json');
    const items = await response.json();
    return items.find(item => item.type === 'page') || null;
  }, 8_000, 'Chrome page target');
  return { process, webSocketUrl: targets.webSocketDebuggerUrl };
}

async function connectCdp(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result || {});
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return {
    command(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    close() { socket.close(); },
  };
}

const mockNetwork = `(() => {
  const smoke = window.__speedpulseSmoke = { requests: [], alerts: [], errors: [], mode: 'success' };
  try { localStorage.setItem('app_version', '6.0'); } catch {}
  window.alert = message => smoke.alerts.push(String(message));
  window.addEventListener('error', event => smoke.errors.push(String(event.message || 'unknown')));
  window.addEventListener('unhandledrejection', event => {
    smoke.errors.push(String(event.reason?.message || event.reason));
  });
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const value = String(input);
    if (!value.startsWith('https://speed.cloudflare.com/')) return originalFetch(input, options);
    smoke.requests.push(value);
    if (smoke.mode === 'stall') {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort',
          () => reject(new DOMException('Test stopped', 'AbortError')), { once: true });
      });
    }
    if (value.includes('/__down')) {
      const bytes = Number(new URL(value).searchParams.get('bytes') || 0);
      return Promise.resolve({
        ok: true, status: 200,
        body: new ReadableStream({
          start(controller) {
            if (bytes > 0) controller.enqueue(new Uint8Array(bytes));
            controller.close();
          }
        }),
      });
    }
    return Promise.resolve({ ok: true, status: 200 });
  };
})();`;

async function main() {
  const server = localServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'speedpulse-browser-'));
  let chromeProcess;
  let cdp;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const browser = await startChrome(profile);
    chromeProcess = browser.process;
    cdp = await connectCdp(browser.webSocketUrl);
    await cdp.command('Page.enable');
    await cdp.command('Runtime.enable');
    await cdp.command('Page.addScriptToEvaluateOnNewDocument', { source: mockNetwork });
    await cdp.command('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' });

    async function evaluate(expression) {
      const answer = await cdp.command('Runtime.evaluate', {
        expression, returnByValue: true, awaitPromise: true,
      });
      if (answer.exceptionDetails) {
        throw new Error(answer.exceptionDetails.text + ': ' +
          (answer.exceptionDetails.exception?.description || ''));
      }
      return answer.result?.value;
    }

    await until(() => evaluate('Boolean(document.getElementById("start-btn") && document.readyState === "complete")'),
      20_000, 'dashboard load');

    const selection = await evaluate(`(() => {
      const dropdown = document.getElementById('test-profile-select');
      dropdown.value = 'quick';
      dropdown.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        selected: dropdown.value,
        caption: document.getElementById('profile-budget-note')?.textContent,
      };
    })()`);
    assert.equal(selection.selected, 'quick');
    assert.match(selection.caption, /6 MiB/);

    await evaluate('document.getElementById("start-btn").click()');
    await until(() => evaluate('document.getElementById("gauge-phase")?.textContent === "Finished"'),
      25_000, 'Quick mock speed-test completion');
    const success = await evaluate(`(() => ({
      ping: document.getElementById('val-ping')?.textContent,
      down: document.getElementById('val-down')?.textContent,
      up: document.getElementById('val-up')?.textContent,
      progress: Number(document.getElementById('prog-down')?.getAttribute('aria-valuenow')),
      alerts: window.__speedpulseSmoke.alerts,
      errors: window.__speedpulseSmoke.errors,
      requests: window.__speedpulseSmoke.requests,
    }))()`);
    for (const field of ['ping', 'down', 'up']) assert.match(success[field], /\d/);
    assert.equal(success.progress, 100);
    assert.deepEqual(success.alerts, []);
    assert.deepEqual(success.errors, []);
    assert.ok(success.requests.some(url => url.includes('/__down?bytes=5242880')));
    assert.ok(success.requests.some(url => url.includes('/__up?bytes=1048576')));

    // Start a second run with intentionally stalled HTTP probes, then Stop.
    await evaluate(`(() => {
      window.__speedpulseSmoke.mode = 'stall';
      document.getElementById('start-btn').click();
    })()`);
    await until(() => evaluate('document.getElementById("gauge-phase")?.textContent === "Ping Test"'),
      12_000, 'stalled ping stage');
    await evaluate('document.getElementById("stop-btn").click()');
    await until(() => evaluate('document.getElementById("gauge-phase")?.textContent === "Aborted"'),
      5_000, 'cancellation UI');
    const stopped = await evaluate(`(() => ({
      phase: document.getElementById('gauge-phase').textContent,
      startVisible: !document.getElementById('start-btn').classList.contains('hidden'),
      alerts: window.__speedpulseSmoke.alerts,
      errors: window.__speedpulseSmoke.errors
    }))()`);
    assert.equal(stopped.phase, 'Aborted');
    assert.ok(stopped.startVisible);
    assert.deepEqual(stopped.alerts, []);
    assert.deepEqual(stopped.errors, []);
    console.log('Browser smoke passed: Quick profile, mocked speed test, true download progress, Stop.');
  } finally {
    cdp?.close();
    if (chromeProcess && chromeProcess.exitCode === null) {
      const exited = new Promise(resolve => chromeProcess.once('exit', resolve));
      chromeProcess.kill('SIGTERM');
      await Promise.race([exited, sleep(3000)]);
      if (chromeProcess.exitCode === null) chromeProcess.kill('SIGKILL');
    }
    await new Promise(resolve => server.close(resolve));
    // Chrome can briefly hold profile files after DevTools has closed.
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 12, retryDelay: 200 });
  }
}

main().catch(error => {
  console.error('[SpeedPulse browser smoke] ' + (error.stack || error));
  process.exitCode = 1;
});
