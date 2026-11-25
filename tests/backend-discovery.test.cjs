'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'main-files', 'backend-status.js'), 'utf8');
const health = { service: 'SpeedPulseBackend', status: 'ok' };
const limits = { maxDownloadBytes: 10 * 1024 * 1024, maxUploadBytes: 2 * 1024 * 1024 };
const response = (body, ok = true) => ({ ok, json: async () => body });

// Run the actual shipped discovery script with isolated browser-like globals.
// No public service, network connection or real timer is needed.
function launch({ hostname = 'localhost', protocol = 'http:', selected = 'local',
  reply = [], missing = false } = {}) {
  const local = { disabled: true, textContent: '' };
  const select = { value: selected, querySelector: () => local };
  const status = { textContent: '' };
  const window = {};
  const requests = [];
  let deadline;
  let cleared = 0;
  let delay;
  const completion = vm.runInNewContext(source, {
    document: { getElementById: id => missing ? null :
      ({ 'server-select': select, 'backend-status': status })[id] },
    location: { protocol, hostname },
    window, AbortController,
    fetch: async (url, options) => {
      const index = requests.length;
      requests.push({ url, options });
      const result = reply[index];
      if (typeof result === 'function') return result(options);
      if (!result) throw new Error('Unexpected network request: ' + url);
      return result;
    },
    setTimeout: (callback, ms) => { deadline = callback; delay = ms; return 42; },
    clearTimeout: id => { assert.equal(id, 42); cleared++; }
  });
  return { completion, requests, local, select, status, window,
    expire: () => deadline(), get cleared() { return cleared; },
    get delay() { return delay; } };
}

function assertUnavailable(run) {
  assert.equal(run.local.disabled, true);
  assert.equal(run.select.value, 'cloudflare');
  assert.equal(run.window.speedpulseServerLimits, undefined);
  assert.match(run.local.textContent, /unavailable/i);
}

test('static hosting and file URLs never attempt ASP.NET discovery', async () => {
  for (const location of [
    { hostname: 'sanskarin.github.io', protocol: 'https:' },
    { hostname: '', protocol: 'file:' },
  ]) {
    const run = launch(location);
    await run.completion;
    assertUnavailable(run);
    assert.equal(run.requests.length, 0);
    assert.equal(run.cleared, 0);
  }
});

test('healthy ASP.NET discovery requires both endpoints and publishes effective limits', async () => {
  const run = launch({ selected: 'cloudflare', reply: [response(health), response(limits)] });
  await run.completion;
  assert.deepEqual(run.requests.map(r => r.url), ['/api/health', '/api/config']);
  for (const { options } of run.requests) {
    assert.equal(options.method, 'GET');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal, run.requests[0].options.signal);
  }
  assert.equal(run.local.disabled, false);
  assert.equal(run.select.value, 'cloudflare', 'do not override user selection');
  assert.equal(run.window.speedpulseServerLimits.maxDownloadBytes, limits.maxDownloadBytes);
  assert.equal(run.window.speedpulseServerLimits.maxUploadBytes, limits.maxUploadBytes);
  assert.match(run.status.textContent, /online/i);
  assert.equal(run.delay, 3000);
  assert.equal(run.cleared, 1);
});

test('failed or unexpected health response prevents config lookup', async () => {
  for (const bad of [response(health, false), response({ status: 'ok', service: 'other' }),
    response({ service: 'SpeedPulseBackend', status: 'down' }),
    { ok: true, json: async () => { throw new SyntaxError('HTML instead of JSON'); } }]) {
    const run = launch({ reply: [bad] });
    await run.completion;
    assertUnavailable(run);
    assert.equal(run.requests.length, 1);
    assert.equal(run.cleared, 1);
  }
});

test('malformed or unavailable configuration cannot enable local measurements', async () => {
  for (const bad of [response(limits, false), response({}), response(null),
    response({ ...limits, maxDownloadBytes: 0 }),
    response({ ...limits, maxDownloadBytes: 1.5 }),
    response({ ...limits, maxUploadBytes: '1024' }),
    response({ ...limits, maxUploadBytes: Infinity })]) {
    const run = launch({ reply: [response(health), bad] });
    await run.completion;
    assertUnavailable(run);
    assert.equal(run.requests.length, 2);
    assert.equal(run.cleared, 1);
  }
});

test('one discovery deadline also cancels a stalled config request', async () => {
  let started;
  const configStarted = new Promise(resolve => { started = resolve; });
  const run = launch({ reply: [response(health), options => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    started();
  })] });
  await Promise.race([configStarted, run.completion]);
  assert.equal(run.requests.length, 2);
  run.expire();
  await run.completion;
  assert.equal(run.requests[1].options.signal.aborted, true);
  assertUnavailable(run);
  assert.equal(run.cleared, 1);
});

test('discovery safely skips pages without dashboard controls', async () => {
  const run = launch({ missing: true });
  await run.completion;
  assert.equal(run.requests.length, 0);
  assert.equal(run.cleared, 0);
});
