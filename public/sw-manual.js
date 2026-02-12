// Manual Service Worker for Champ PWA
// This is a fallback if next-pwa doesn't work with Next.js 16 Turbopack

const CACHE_NAME = 'champ-v1';
const RUNTIME_CACHE = 'champ-runtime';
const FIREBASE_CACHE = 'champ-firebase';
const IMAGE_CACHE = 'champ-images';

// Cache these URLs immediately when SW installs
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching core assets');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== FIREBASE_CACHE &&
              cacheName !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Firebase Firestore/Auth - network first, short cache
  if (url.hostname.includes('firebaseio.com') || 
      url.hostname.includes('googleapis.com')) {
    event.respondWith(
      networkFirstStrategy(request, FIREBASE_CACHE, 10000) // 10s timeout
    );
    return;
  }

  // Firebase Storage images - cache first
  if (url.hostname.includes('firebasestorage.googleapis.com')) {
    event.respondWith(
      cacheFirstStrategy(request, IMAGE_CACHE)
    );
    return;
  }

  // Images - cache first
  if (request.destination === 'image' || 
      /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      cacheFirstStrategy(request, IMAGE_CACHE)
    );
    return;
  }

  // JS/CSS - stale while revalidate
  if (request.destination === 'script' || 
      request.destination === 'style' ||
      /\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(
      staleWhileRevalidateStrategy(request, RUNTIME_CACHE)
    );
    return;
  }

  // Same-origin pages - network first
  if (url.origin === self.location.origin) {
    event.respondWith(
      networkFirstStrategy(request, RUNTIME_CACHE, 10000)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Everything else - network only
  event.respondWith(fetch(request));
});

// Strategy: Network First (good for dynamic content)
async function networkFirstStrategy(request, cacheName, timeout = 5000) {
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    );

    const response = await Promise.race([networkPromise, timeoutPromise]);
    
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network first failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Strategy: Cache First (good for static assets)
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache first failed:', request.url);
    throw error;
  }
}

// Strategy: Stale While Revalidate (good for JS/CSS)
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response && response.ok) {
      const cache = caches.open(cacheName);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });

  return cached || fetchPromise;
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log('[SW] Service worker loaded');
