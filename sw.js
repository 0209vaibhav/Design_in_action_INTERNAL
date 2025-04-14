const CACHE_NAME = 'memento-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './data/logo/Logo.svg',
  './data/logo/icon-512x512.png',
  './data/logo/icon-192x192.png',
  './data/logo/icon-180x180.png',
  './data/logo/icon-167x167.png',
  './data/logo/icon-152x152.png',
  './data/logo/icon-96x96.png',
  './data/logo/favicon-32x32.png',
  './data/logo/favicon-16x16.png',
  './styles/memento-details.css',
  './styles/layout.css',
  './styles/navigation.css',
  './styles/map-container.css',
  './styles/marker.css',
  './styles/filter-settings.css',
  './styles/profile-container.css',
  './styles/auth-container.css',
  './styles/capture-form.css',
  './styles/info-container.css',
  './styles/live-feed-container.css',
  './styles/drafts-container.css',
  './styles/archive-container.css',
  './styles/curated-container.css',
  './styles/favorites-container.css',
  './styles/credits-container.css',
  './styles/help-container.css',
  './styles/toast-notification.css',
  './styles/my-mementos-container.css',
  './styles/animations.css',
  './styles/memento-markers.css',
  './scripts/script.js',
  './scripts/firebase-config.js',
  './scripts/firebase-setup.js',
  './scripts/toast-notification.js',
  './scripts/layout.js',
  './scripts/navigation.js',
  './scripts/map-container.js',
  './scripts/auth-container.js',
  './scripts/activities.js',
  './scripts/capture-form.js',
  './scripts/credits-container.js',
  './scripts/curated-container.js',
  './scripts/drafts-container.js',
  './scripts/favorites-container.js',
  './scripts/filter-settings.js',
  './scripts/help-container.js',
  './scripts/info-container.js',
  './scripts/live-feed-container.js',
  './scripts/profile-container.js',
  './scripts/my-mementos.js',
  './scripts/confirmation-dialog.js',
  'https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.js',
  'https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('All resources have been cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Cache addAll error:', error);
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME) {
              console.log('Deleting old cache:', cache);
              return caches.delete(cache);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();

        // Make network request
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it can only be used once
            const responseToCache = response.clone();

            // Add new response to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // You could return a custom offline page here
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
}); 