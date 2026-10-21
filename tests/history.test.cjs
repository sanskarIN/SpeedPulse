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
  assert.match(csv, /Profile","Status/);
  assert.ok(csv.includes("'=HYPERLINK("));
  assert.match(csv, /"Partial"/);
  assert.ok(csv.includes('18.21'));
});
