'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'history.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

function initHistory(initial = '') {
  const entries = new Map(initial ? [['speedpulse_history', initial]] : []);
  const state = { blob: null };
  const store = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key)
  };
  const exports = {};
  const document = {
    body: { appendChild() {} },
    createElement() {
      return { href: '', download: '', click() {}, remove() {} };
    }
  };
  const URL = {
    createObjectURL(blob) { state.blob = blob; return 'blob:test'; },
    revokeObjectURL() {}
  };
  vm.runInNewContext(js, { exports, localStorage: store, document, URL,
    Blob, Date, Math, setTimeout: fn => fn() });
  return { api: exports, state, entries };
}

test('malformed history data never breaks the dashboard', () => {
  for (const stored of ['{bad json', '{"item": 1}', '[null, false, 9, {}]']) {
    const { api } = initHistory(stored);
    assert.equal(api.getHistory().length, 0);
  }
});

test('saved profiles and partial upload results remain distinguishable', () => {
  const { api } = initHistory();
  api.saveResult({ profile: 'quick', download: 43, ping: 12, isp: 'Demo ISP' });
  const result = api.getHistory();
  assert.equal(result.length, 1);
  assert.equal(result[0].profile, 'quick');
  assert.equal(result[0].download, 43);
  assert.equal(result[0].upload, undefined);
});

test('invalid measurements and oversized history fields are cleaned', () => {
  const { api } = initHistory();
  api.saveResult({ download: Infinity, upload: -1, ping: 10, isp: 'a'.repeat(500) });
  const result = api.getHistory()[0];
  assert.equal(result.download, undefined);
  assert.equal(result.upload, undefined);
  assert.equal(result.isp.length, 200);
});

test('CSV export quotes cells and disarms spreadsheet formula injection', async () => {
  const { api, state } = initHistory();
  api.saveResult({ profile: 'standard', isp: '=HYPERLINK("evil","click")',
    download: 18.21, ping: 34.2 });
  api.exportToCSV();
  assert.ok(state.blob);
  const csv = await state.blob.text();
  assert.match(csv, /Profile","Server","Download bytes","Upload bytes","Status/);
  assert.ok(csv.includes("'=HYPERLINK("));
  assert.match(csv, /"Partial"/);
  assert.ok(csv.includes('18.21'));
});

test('endpoint and actual byte budgets survive storage round-trips', () => {
  const { api } = initHistory();
  const record = api.saveResult({
    isp: 'Example Network', server: 'cloudflare', profile: 'quick',
    downloadBytes: 5242880, uploadBytes: 1048576,
    download: 28.5, upload: 11.3, ping: 13,
  })[0];
  assert.equal(record.server, 'cloudflare');
  assert.equal(record.downloadBytes, 5242880);
  assert.equal(record.uploadBytes, 1048576);
  assert.equal(api.getHistory()[0].server, 'cloudflare');
  assert.equal(api.endpointLabel(record.server), 'Cloudflare CDN');
});

test('legacy histories remain visible but cannot be assigned a guessed endpoint', () => {
  const { api } = initHistory(JSON.stringify([{
    id: 'legacy-1', date: '2026-10-12T10:00:00.000Z', profile: 'standard',
    download: 640, upload: 90, isp: 'Old Network',
  }]));
  const legacy = api.getHistory()[0];
  assert.equal(legacy.server, undefined);
  assert.equal(api.endpointLabel(legacy.server), 'Unknown (legacy)');
  assert.equal(api.areResultsComparable(legacy, {
    server: 'cloudflare', profile: 'standard',
    downloadBytes: 26214400, uploadBytes: 5242880,
  }), false);
});

test('unknown endpoints and invalid transfer byte budgets cannot spoof comparable records', () => {
  const { api } = initHistory();
  const [newest] = api.saveResult({
    server: 'localhost', profile: 'thorough',
    downloadBytes: 999999999, uploadBytes: -1, download: 999,
  });
  assert.equal(newest.server, undefined);
  assert.equal(newest.downloadBytes, undefined);
  assert.equal(newest.uploadBytes, undefined);
});

test('personal bests cannot mix Cloudflare, self-hosted, profiles or byte budgets', () => {
  const { api } = initHistory();
  const candidate = {
    server: 'cloudflare', profile: 'quick',
    downloadBytes: 5242880, uploadBytes: 1048576, download: 65,
  };
  const same = api.saveResult({ ...candidate, download: 42 })[0];
  const local = api.saveResult({ ...candidate, server: 'local', download: 9000 })[0];
  const thorough = api.saveResult({ ...candidate, profile: 'thorough', download: 500 })[0];
  const capped = api.saveResult({ ...candidate, downloadBytes: 1048576, download: 160 })[0];
  const legacy = api.saveResult({ download: 800, profile: 'quick' })[0];
  assert.equal(api.previousComparableBest([same, local, thorough, capped, legacy], candidate), 42);
  assert.equal(api.areResultsComparable(same, candidate), true);
  assert.equal(api.areResultsComparable(local, candidate), false);
  assert.equal(api.areResultsComparable(thorough, candidate), false);
  assert.equal(api.areResultsComparable(capped, candidate), false);
  assert.equal(api.previousComparableBest([local, legacy], candidate), null);
});

test('CSV shows source attribution and byte budgets without guessing legacy values', async () => {
  const { api, state } = initHistory();
  api.saveResult({ server: 'local', profile: 'quick',
    downloadBytes: 5242880, uploadBytes: 1048576, download: 100 });
  api.exportToCSV();
  const csv = await state.blob.text();
  assert.ok(csv.includes('"Server","Download bytes","Upload bytes"'));
  assert.ok(csv.includes('"Local ASP.NET","5242880","1048576"'));
});
