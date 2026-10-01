/* Die Hard Dice service worker. Generated into dist/sw.js by scripts/build-sw.mjs (fills the two markers below).
   Cache-first for everything precached; a new version waits until the page sends SKIP_WAITING. */
const PRECACHE = /*__PRECACHE__*/ [];
const VERSION = /*__VERSION__*/ '';
const CACHE = 'dhd-' + VERSION;
const BASE = self.registration.scope; // folder where sw.js lives: works from any sub-path
const abs = (rel) => new URL(rel, BASE).href;
const URLS = new Set(PRECACHE.map(abs));
const INDEX = abs('index.html');

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([...URLS])));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dhd-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match(INDEX).then((r) => r || fetch(req)));
    return;
  }
  url.search = '';
  url.hash = '';
  if (!URLS.has(url.href)) return;
  e.respondWith(caches.match(url.href).then((r) => r || fetch(req)));
});
