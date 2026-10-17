'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const site = path.resolve(__dirname, '..', 'main-files');
const read = name => fs.readFileSync(path.join(site, name), 'utf8');

test('static site includes its required entry points', () => {
  for (const file of ['index.html', 'about.html', 'support.html', 'privacy.html', 'terms.html',
    '404.html', 'styles.css', 'bundle.js', 'bundle-dev.js', 'sw.js', 'manifest.json', 'favicon.png']) {
    assert.ok(fs.statSync(path.join(site, file)).size > 0, file + ' is missing or empty');
  }
});

test('homepage defaults to the remote endpoint for static hosting', () => {
  const html = read('index.html');
  assert.match(html, /value="cloudflare" selected/);
  assert.match(html, /hostname\.endsWith\('\.github\.io'\)/);
  assert.match(html, /src="bundle\.js"/);
});

test('public footer links point to current channels', () => {
  for (const name of ['index.html', 'about.html', 'support.html',
    'privacy.html', 'terms.html', '404.html']) {
    const html = read(name);
    assert.match(html, /github\.com\/sanskarIN/);
    assert.match(html, /sanskarin\.github\.io\/contact/);
    assert.doesNotMatch(html, /ramsandesh\.gumroad\.com|github\.com\/Sanskar-in|mailto:/);
  }
});

test('speed tests are not cached by service worker', () => {
  const sw = read('sw.js');
  assert.match(sw, /request\.method !== 'GET'/);
  assert.match(sw, /url\.origin !== self\.location\.origin/);
  assert.match(sw, /startsWith\('speedpulse-'\)/);
});

test('browser script contains real latency data and HTTPS location fallback', () => {
  const js = read('bundle.js');
  assert.doesNotMatch(js, /Math\.round\(\)/);
  assert.doesNotMatch(js, /http:\/\/ip-api\.com/);
  assert.match(js, /https:\/\/ipwho\.is\//);
});
