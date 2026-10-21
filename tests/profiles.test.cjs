'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'test-profiles.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

function loadModule(storage) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, localStorage: storage, Object });
  return exports;
}

test('typed test profiles respect the local server transfer caps', () => {
  const profiles = loadModule({});
  for (const id of ['quick', 'standard', 'thorough']) {
    const profile = profiles.getTestProfile(id);
    assert.equal(profile.id, id);
    assert.ok(profile.downloadBytes > 0 && profile.downloadBytes <= 64 * 1024 * 1024);
    assert.ok(profile.uploadBytes > 0 && profile.uploadBytes <= 8 * 1024 * 1024);
  }
  assert.equal(profiles.getTestProfile('quick').downloadBytes, 5 * 1024 * 1024);
  assert.equal(profiles.getTestProfile('standard').uploadBytes, 5 * 1024 * 1024);
  assert.equal(profiles.getTestProfile('thorough').uploadBytes, 8 * 1024 * 1024);
});

test('invalid or corrupted profile selections fall back to Standard', () => {
  const profiles = loadModule({});
  for (const invalid of ['unknown', 'toString', null, 123, {}]) {
    assert.equal(profiles.getTestProfile(invalid).id, 'standard');
  }
});

test('profile preference can be saved and restored locally', () => {
  const entries = new Map();
  const storage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
  const profiles = loadModule(storage);
  profiles.saveTestProfile('quick');
  assert.equal(entries.get('speedpulse_test_profile'), 'quick');
  assert.equal(profiles.loadTestProfile().id, 'quick');
});

test('storage restrictions never prevent selecting a valid profile', () => {
  const storage = {
    getItem: () => { throw new Error('Access blocked'); },
    setItem: () => { throw new Error('Access blocked'); },
  };
  const profiles = loadModule(storage);
  assert.equal(profiles.loadTestProfile().id, 'standard');
  assert.equal(profiles.saveTestProfile('thorough').id, 'thorough');
});

test('public frontend exposes the data budget selector', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'main-files/index.html'), 'utf8');
  const bundle = fs.readFileSync(path.join(__dirname, '..', 'main-files/bundle.js'), 'utf8');
  assert.match(html, /id="test-profile-select"/);
  assert.match(html, /id="profile-budget-note"/);
  assert.match(bundle, /profile\.downloadBytes/);
  assert.match(bundle, /profile\.uploadBytes/);
});
