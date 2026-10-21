'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'readiness.ts'), 'utf8');
const js = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const exports = {};
vm.runInNewContext(js, { exports, Number });
const { calculateReadiness, READINESS_ORDER } = exports;

test('real measured values classify supported readiness hints', () => {
  const result = calculateReadiness({ download: 500, upload: 50, ping: 10, jitter: 2 });
  assert.deepEqual(READINESS_ORDER, ['streaming4K','videoCalls','gaming','largeUploads']);
  for (const key of READINESS_ORDER) assert.equal(result[key], 'pass');
});

test('upload failures mark dependent readiness hints unknown, not failed', () => {
  const result = calculateReadiness({ download: 60, ping: 12, jitter: 3 });
  assert.equal(result.streaming4K, 'pass');
  assert.equal(result.gaming, 'pass');
  assert.equal(result.videoCalls, 'unknown');
  assert.equal(result.largeUploads, 'unknown');
});

test('measured zero is distinguishable from missing data', () => {
  const result = calculateReadiness({ download: 0, upload: 0, ping: 200, jitter: 100 });
  for (const key of READINESS_ORDER) assert.equal(result[key], 'fail');
});

test('corrupted and non-finite data cannot mark a readiness hint as passing', () => {
  const result = calculateReadiness({
    download: Infinity, upload: NaN, ping: null, jitter: -1,
  });
  for (const key of READINESS_ORDER) assert.equal(result[key], 'unknown');
});
