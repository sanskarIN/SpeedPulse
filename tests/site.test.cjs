'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const site = path.resolve(__dirname, '..', 'main-files');
const read = name => fs.readFileSync(path.join(site, name), 'utf8');

test('static site includes its required entry points', () => {
  for (const file of ['index.html', 'about.html', 'support.html', 'privacy.html', 'terms.html',
    '404.html', 'styles.css', 'bundle.js', 'bundle-dev.js', 'backend-status.js', 'sw.js', 'manifest.json', 'favicon.png']) {
    assert.ok(fs.statSync(path.join(site, file)).size > 0, file + ' is missing or empty');
  }
});

test('homepage defaults to the remote endpoint for static hosting', () => {
  const html = read('index.html');
  assert.match(html, /value="cloudflare" selected/);
  assert.match(html, /src="backend-status\.js" defer/);
  assert.match(read('backend-status.js'), /hostname\.endsWith\('\.github\.io'\)/);
  assert.match(read('backend-status.js'), /fetch\('\/api\/health'/);
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

test('history UI and compiled dashboard identify measurement endpoints', () => {
  assert.match(read('index.html'), /<th>Endpoint<\/th>/);
  const js = read('bundle.js');
  assert.match(js, /Unknown \(legacy\)/);
  assert.match(js, /LAN\/loopback path/);
  assert.match(js, /Not directly comparable: endpoint or data budget differs/);
});

test('partial history comparisons display unavailable values, not NaN or undefined', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/script.ts'), 'utf8');
  assert.match(source, /function displayComparisonMetric/);
  assert.match(source, /'Unavailable'/);
  assert.doesNotMatch(source, /res1\.upload\?\.toFixed/);
  assert.doesNotMatch(source, /Math\.round\(res2\.ping\)/);
  assert.match(read('bundle.js'), /function displayComparisonMetric/);
});

test('shareable gauge capture contains the endpoint provenance label', () => {
  const html = read('index.html');
  assert.match(html, /id="capture-area"/);
  assert.match(html, /id="measurement-source-note"/);
  assert.ok(html.indexOf('id="measurement-source-note"') > html.indexOf('id="capture-area"'));
  assert.ok(html.indexOf('id="measurement-source-note"') < html.indexOf('id="share-btn"'));
  assert.match(read('bundle.js'), /Local ASP.NET server — measuring this LAN\/loopback path/);
  assert.match(read('styles.css'), /\.measurement-source-note/);
});
