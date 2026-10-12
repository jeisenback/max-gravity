'use strict';

// Offline play for hosted copies of the game. Network first, so updates arrive the
// next time you are online; every file the game loads is kept, so it runs offline
// after one visit. CACHE is named for the version in js/build.js (a worker cannot read BUILD, so tests/sw.test.js checks the two agree); a new version drops old copies.
const CACHE = 'max-gravity-0.9.0-dev';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'style.css', 'manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
