const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Developer Labs loads the diagnostics panel', () => {
  assert.match(read('main-files/bundle-dev.js'), /dev-diagnostics\.js/);
  assert.ok(read('main-files/dev-diagnostics.js').length > 1000);
});

test('Developer Diagnostics probes the local ASP.NET API', () => {
  const src = read('src/dev-diagnostics.ts');
  assert.ok(src.includes('/api/health'));
  assert.ok(src.includes('/api/config'));
  assert.ok(src.includes('/api/down?bytes=0'));
  assert.ok(src.includes('maxSamples = 5'));
});

test('Developer Diagnostics includes report and simulation controls', () => {
  const src = read('src/dev-diagnostics.ts');
  assert.ok(src.includes('spd-run-simulation'));
  assert.ok(src.includes('spd-export-report'));
  assert.ok(src.includes('speedpulse-diagnostics.json'));
});

test('legacy diagnostics console escapes messages', () => {
  const src = read('src/developer.ts');
  assert.ok(src.includes('document.createTextNode'));
  assert.ok(src.includes('key.startsWith("speedpulse-")'));
  assert.ok(!src.includes('div.innerHTML'));
});
