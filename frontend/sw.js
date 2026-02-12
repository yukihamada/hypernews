/**
 * Service Worker — Cache strategies for HyperNews PWA
 * v16: Expanded cache, offline improvements, settings/about pages cached
 */

const CACHE_NAME = 'hypernews-v32';
const API_CACHE = 'hypernews-api-v1';
const IMG_CACHE = 'hypernews-img-v1';
const TTS_CACHE = 'hypernews-tts-v1';
const API_MAX_ENTRIES = 500;
const IMG_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/settings.html',
  '/about.html',
  '/pro.html',
  '/ab.html',
  '/css/base.css?v=34',
  '/css/site-claud.css?v=34',
  '/css/theme-hacker.css?v=34',
  '/css/theme-card.css?v=34',
  '/css/theme-lite.css?v=34',
  '/css/theme-terminal.css?v=34',
  '/css/theme-magazine.css?v=34',
  '/css/theme-brutalist.css?v=34',
  '/css/theme-pastel.css?v=34',
  '/css/theme-neon.css?v=34',
  '/css/chat.css?v=34',
  '/css/ads.css?v=34',
  '/css/settings.css?v=34',
  '/css/about.css?v=34',
  '/css/pro.css?v=34',
  '/js/errors.js?v=34',
  '/js/vitals.js?v=34',
  '/js/storage.js?v=34',
  '/js/site.js?v=34',
  '/js/ab.js?v=34',
  '/js/subscription.js?v=34',
  '/js/google-auth.js?v=34',
  '/js/konami.js?v=34',
  '/js/ads.js?v=34',
  '/js/api.js?v=34',
  '/js/theme.js?v=34',
  '/js/renderer.js?v=34',
  '/js/tts.js?v=34',
  '/js/commands.js?v=34',
  '/js/chat.js?v=34',
  '/js/app.js?v=34',
  '/js/sw-register.js?v=34',
  '/js/settings.js?v=34',
  '/manifest.json',
  '/manifest-claud.json',
  '/manifest-online.json',
  '/manifest-cloud.json',
  '/manifest-chatnews.json',
  '/manifest-yournews.json',
  '/manifest-velo.json',
  '/css/feed.css?v=34',
  '/js/feed.js?v=34',
  '/js/feed-player.js?v=34',
  '/js/feed-voice.js?v=34',
  '/css/feed-murmur.css?v=34',
  '/js/feed-murmur.js?v=34',
  '/css/cloud.css?v=34',
  '/js/cloud.js?v=34',
  '/css/chatnews.css?v=34',
  '/js/chatnews.js?v=34',
  '/css/yournews.css?v=34',
  '/js/yournews.js?v=34',
  '/css/velo.css?v=34',
  '/js/velo.js?v=34',
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
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE && k !== IMG_CACHE && k !== TTS_CACHE)
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
