'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'dashboard-chart.ts'), 'utf8');
const javascript = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

function setup(theme = 'dark', config = '{"base":"dark"}') {
  const exports = {};
  let refreshes = 0;
  const document = {
    documentElement: { getAttribute: () => theme },
    getElementById: () => ({ getContext: () => ({}) }),
  };
  class Chart {
    static defaults = { color: 'black' };
    constructor(_ctx, config) {
      this.config = config;
      this.options = { scales: { x: { ticks: {} }, y: { ticks: {} } } };
    }
    update() { refreshes++; }
  }
  vm.runInNewContext(javascript, {
    exports, document, Chart,
    localStorage: { getItem: () => config },
    Date, console,
  });
  return { api: exports, Chart, getRefreshes: () => refreshes };
}

test('chart adapter keeps only last 50 aligned real download/upload samples', () => {
  const { api } = setup();
  api.initChart();
  for (let i = 1; i <= 70; i++) api.addChartPoint(i, i % 2 === 0);
  const samples = api.getChartSamples();
  assert.equal(samples.labels.length, 50);
  assert.equal(samples.download.length, 50);
  assert.equal(samples.upload.length, 50);
  assert.equal(samples.upload[0], 21);
  assert.equal(samples.download[1], 22);
  assert.equal(samples.download[0], null);
  assert.equal(samples.upload[1], null);
});

test('chart rejects invalid measurement values without corrupting arrays', () => {
  const { api } = setup();
  api.addChartPoint(NaN, true);
  api.addChartPoint(-1, false);
  api.addChartPoint(Infinity, true);
  assert.equal(api.getChartSamples().labels.length, 0);
  api.addChartPoint(12.5, true);
  const snapshot = api.getChartSamples();
  snapshot.download[0] = -999;
  assert.equal(api.getChartSamples().download[0], 12.5);
  api.clearChart();
  assert.equal(api.getChartSamples().labels.length, 0);
});

test('invalid theme storage does not prevent chart initialization', () => {
  const { api, Chart } = setup('custom', '{broken-json');
  api.initChart();
  assert.equal(Chart.defaults.color, '#94a3b8');
  api.updateChartTheme();
});

test('chart works without optional Chart.js CDN', () => {
  const exports = {};
  vm.runInNewContext(javascript, {
    exports,
    document: { documentElement: { getAttribute: () => 'dark' }, getElementById: () => null },
    localStorage: { getItem: () => null },
    Date, console,
  });
  exports.initChart();
  exports.addChartPoint(4.2, true);
  assert.equal(exports.getChartSamples().download.length, 1);
  exports.clearChart();
  assert.equal(exports.getChartSamples().download.length, 0);
});
