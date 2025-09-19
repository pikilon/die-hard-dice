const CACHE_NAME = 'die-hard-dice-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // External modules from importmap
  'https://cdn.jsdelivr.net/npm/lodash.shuffle@latest/index.js',
  'https://cdn.jsdelivr.net/npm/lit@latest/+esm',
  'https://cdn.jsdelivr.net/npm/lit@latest/',
  // Add more assets here if needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Cache first
        }
        return fetch(event.request).then(networkResponse => {
          // Optionally cache new requests here
          return networkResponse;
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});
