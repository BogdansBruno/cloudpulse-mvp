// CloudPulse service worker: lets the app open without a connection.
//
// What it caches:
//   /_next/static/*, /icons/*  build files with hashed names, so they never
//                              change: cache first.
//   page loads (HTML)          network first, keeping the last good copy of
//                              each page; with a weak signal the saved copy
//                              is shown after a few seconds.
//   /offline.html              shown for a page never opened online.
// What it never touches:
//   POST requests (check-ins are queued by the app itself, see
//   lib/offline-queue.ts), /api/*, Supabase and any other site, URLs with a
//   query string (e.g. /pass?t=...). Pages are client-rendered, so the saved
//   HTML is the same empty shell for everyone: no personal data is cached.
//
// Bump VERSION to throw every cache away on the next visit.

const VERSION = 'v1';
const STATIC_CACHE = `cp-static-${VERSION}`;
const PAGE_CACHE = `cp-pages-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];
const PAGE_TIMEOUT_MS = 4000;
const MAX_STATIC_ENTRIES = 250;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('cp-') && k !== STATIC_CACHE && k !== PAGE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(pageNetworkFirst(req, url));
  }
  // Everything else (RSC payloads, images, ...) goes to the network as usual.
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    trim(cache, MAX_STATIC_ENTRIES);
  }
  return res;
}

async function pageNetworkFirst(req, url) {
  const cache = await caches.open(PAGE_CACHE);
  const cacheable = url.search === '';

  const network = fetch(req).then((res) => {
    if (cacheable && res.ok && res.type === 'basic') {
      cache.put(url.pathname, res.clone()).catch(() => undefined);
    }
    return res;
  });

  const saved = cacheable ? await cache.match(url.pathname) : undefined;
  if (!saved) {
    try {
      return await network;
    } catch {
      return (await caches.match(OFFLINE_URL)) || Response.error();
    }
  }

  // A saved copy exists: take the network if it answers quickly, otherwise
  // the saved page (the network response still refreshes the cache later).
  const timeout = new Promise((resolve) => setTimeout(() => resolve(saved), PAGE_TIMEOUT_MS));
  return Promise.race([network.catch(() => saved), timeout]);
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
