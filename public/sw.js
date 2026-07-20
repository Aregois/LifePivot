// ─── Cache versioning ───────────────────────────────────────────────────────
// Bump this version whenever you deploy code changes.
// The activate event will delete all caches with a different name,
// ensuring users always receive fresh JS/CSS bundles after updates.
const CACHE_NAME = 'lifepivot-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — delete ALL old caches so stale JS bundles are evicted
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, HMR, and Supabase requests
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    request.url.includes('/_next/webpack-hmr') ||
    request.url.includes('/supabase/')
  ) {
    return;
  }

  // ── Next.js JS/CSS chunks: Stale-While-Revalidate ──────────────────────
  // Serve from cache immediately (fast), then fetch fresh in background.
  // On next load the user gets the updated version.
  const isNextChunk =
    request.url.includes('/_next/static/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js');

  if (isNextChunk) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const networkFetch = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          // Return cached immediately if available, otherwise wait for network
          return cachedResponse || networkFetch;
        });
      })
    );
    return;
  }

  // ── Images/fonts: Cache First (immutable, no need to re-fetch) ──────────
  const isImmutableAsset =
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.includes('/fonts/');

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          return networkResponse;
        }).catch(() => undefined);
      })
    );
    return;
  }

  // ── Dynamic pages: Network First ────────────────────────────────────────
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});
