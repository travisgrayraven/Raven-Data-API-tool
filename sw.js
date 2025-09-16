const CACHE_NAME = 'ravenview-v1';
// List of files to cache.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512-512.png',
  'https://cdn.tailwindcss.com/',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://i.ibb.co/B2hyVFKy/Raven-Logo-White-on-Transparent-3.png',
  'https://i.ibb.co/RpWcXBcc/Raven-Logo-Black-on-Transparent-Banner-7.png'
];

// Install event: opens a cache and adds the core files to it.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use fetch with no-cache to ensure we get the latest assets from the network during install.
        const cachePromises = URLS_TO_CACHE.map(urlToCache => {
          const request = new Request(urlToCache, { cache: 'reload' });
          return fetch(request).then(response => {
            if (response.ok) {
              return cache.put(urlToCache, response);
            }
            return Promise.resolve(); // Ignore errors for non-critical assets like fonts or images
          }).catch(err => {
            console.warn(`Could not cache ${urlToCache}:`, err);
          });
        });
        return Promise.all(cachePromises);
      })
  );
});

// Activate event: cleans up old caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: serves assets from cache, falling back to network.
// API calls are fetched from the network.
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Use a network-first strategy for the main HTML file to get updates faster.
  if (request.mode === 'navigate' && url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }
  
  // Don't cache API calls or external resources not in our cache list
  if (
    url.pathname.includes('/auth/token') ||
    url.pathname.includes('/ravens') ||
    url.hostname.includes('nhtsa.dot.gov') ||
    url.hostname.includes('ravenview-proxy') ||
    url.hostname.includes('esm.sh') || // Dynamic imports
    url.hostname.includes('aistudiocdn.com')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // For all other requests, use a cache-first strategy.
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network and return it. We don't cache these on the fly.
        return fetch(request);
      })
  );
});