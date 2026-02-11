/**
 * Service Worker — Cache strategies for HyperNews PWA
 * v16: Expanded cache, offline improvements, settings/about pages cached
 */

const CACHE_NAME = 'hypernews-v17';
const API_CACHE = 'hypernews-api-v1';
const IMG_CACHE = 'hypernews-img-v1';
const API_MAX_ENTRIES = 500;
const IMG_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/settings.html',
  '/about.html',
  '/ab.html',
  '/css/base.css?v=16',
  '/css/site-claud.css?v=16',
  '/css/theme-hacker.css?v=16',
  '/css/theme-card.css?v=16',
  '/css/theme-lite.css?v=16',
  '/css/chat.css?v=16',
  '/css/settings.css?v=16',
  '/css/about.css?v=16',
  '/js/storage.js?v=16',
  '/js/site.js?v=16',
  '/js/ab.js?v=16',
  '/js/subscription.js?v=16',
  '/js/api.js?v=16',
  '/js/theme.js?v=16',
  '/js/renderer.js?v=16',
  '/js/tts.js?v=16',
  '/js/commands.js?v=16',
  '/js/chat.js?v=16',
  '/js/app.js?v=16',
  '/js/sw-register.js?v=16',
  '/js/settings.js?v=16',
  '/manifest.json',
  '/manifest-claud.json',
  '/manifest-online.json',
  '/manifest-cloud.json',
  '/manifest-chatnews.json',
  '/manifest-yournews.json',
  '/manifest-velo.json',
  '/css/feed.css?v=17',
  '/js/feed.js?v=17',
  '/js/feed-player.js?v=17',
  '/js/feed-voice.js?v=17',
  '/css/cloud.css?v=1',
  '/js/cloud.js?v=1',
  '/css/chatnews.css?v=1',
  '/js/chatnews.js?v=1',
  '/css/yournews.css?v=1',
  '/js/yournews.js?v=1',
  '/css/velo.css?v=1',
  '/js/velo.js?v=1',
];

// Install: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE && k !== IMG_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: strategy per resource type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // POST requests: pass through (admin commands, AI)
  if (request.method !== 'GET') {
    return;
  }

  // API requests: stale-while-revalidate with dedicated cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidateApi(request));
    return;
  }

  // Images: cache-first with expiry
  if (
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  // Static assets: cache-first + background update
  event.respondWith(cacheFirstWithUpdate(request));
});

// Message handler: prefetch categories
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PREFETCH_CATEGORIES') {
    const categories = event.data.categories || [];
    prefetchCategories(categories);
  }
});

async function prefetchCategories(categories) {
  const cache = await caches.open(API_CACHE);
  for (const cat of categories) {
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (cat) params.set('category', cat);
      const url = `/api/articles?${params}`;
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(new Request(url), response);
      }
    } catch {
      // Network error — skip
    }
  }
  // Also prefetch categories list
  try {
    const catRes = await fetch('/api/categories');
    if (catRes.ok) {
      await cache.put(new Request('/api/categories'), catRes);
    }
  } catch { /* skip */ }

  // Trim API cache
  await trimCache(API_CACHE, API_MAX_ENTRIES);
}

async function cacheFirstWithUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Background update
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await fetchPromise;
  if (response) return response;

  // Offline fallback for navigation
  if (request.mode === 'navigate') {
    const offline = await cache.match('/offline.html');
    if (offline) return offline;
  }

  return new Response('Offline', { status: 503 });
}

async function staleWhileRevalidateApi(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        // Trim after adding
        trimCache(API_CACHE, API_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMG_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 404 });
  }
}

/** Trim a cache to maxEntries by removing oldest entries */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // Remove oldest entries (first in list = oldest)
  const toDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(toDelete.map((k) => cache.delete(k)));
}
