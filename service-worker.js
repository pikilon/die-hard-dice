
/** @type {string} */
const CACHE_NAME = 'die-hard-dice-cache-v1';

/** @type {string[]} */
const urlsToCache = [
  '/',
  '/index.html',
  // External modules from importmap
  'https://cdn.jsdelivr.net/npm/lodash.shuffle@latest/index.js',
  'https://cdn.jsdelivr.net/npm/lit@latest/+esm',
  'https://cdn.jsdelivr.net/npm/lit@latest/',
  // Add more assets here if needed
];

/**
 * Install event handler
 * @param {Event} event
 */
self.addEventListener('install', event => {
  const extEvent = /** @type {ExtendableEvent} */ (event);
  extEvent.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

/**
 * Fetch event handler
 * @param {Event} event
 */
self.addEventListener('fetch', event => {
  const fetchEvent = /** @type {FetchEvent} */ (event);
  fetchEvent.respondWith(
    caches.match(fetchEvent.request)
      .then(response => {
        if (response) {
          return response; // Cache first
        }
        return fetch(fetchEvent.request).then(networkResponse => {
          // Optionally cache new requests here
          return networkResponse;
        });
      })
  );
});

/**
 * Activate event handler
 * @param {Event} event
 */
self.addEventListener('activate', event => {
  const extEvent = /** @type {ExtendableEvent} */ (event);
  extEvent.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});
