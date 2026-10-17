/* SpeedPulse static-app service worker. No speed-test responses are cached. */
const CACHE_NAME = 'speedpulse-static-v7';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './bundle.js',
  './manifest.json',
  './favicon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('speedpulse-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (request.mode === 'navigate') {
    // Prefer current HTML; permit cached shell navigation when offline.
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match(request)) || (await caches.match('./index.html'))));
    return;
  }

  // Prefer fresh application scripts so new bug fixes are never obscured
  // by an older, previously installed service-worker cache.
  if (url.pathname.endsWith('/bundle.js') || url.pathname.endsWith('/backend-status.js')
      || url.pathname.endsWith('/bundle-dev.js') || url.pathname.endsWith('/dev-diagnostics.js')) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(caches.match(request).then(async cached => {
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && SHELL.some(path => new URL(path, self.registration.scope).href === request.url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }));
});
