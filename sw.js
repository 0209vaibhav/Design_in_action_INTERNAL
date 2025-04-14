const CACHE_NAME = 'memento-v1';
const BASE_PATH = '/Memento/';
const ASSETS_TO_CACHE = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'styles/memento-details.css',
  BASE_PATH + 'styles/layout.css',
  BASE_PATH + 'styles/navigation.css',
  BASE_PATH + 'styles/map-container.css',
  BASE_PATH + 'styles/marker.css',
  BASE_PATH + 'styles/filter-settings.css',
  BASE_PATH + 'styles/profile-container.css',
  BASE_PATH + 'styles/auth-container.css',
  BASE_PATH + 'styles/capture-form.css',
  BASE_PATH + 'styles/info-container.css',
  BASE_PATH + 'styles/live-feed-container.css',
  BASE_PATH + 'styles/drafts-container.css',
  BASE_PATH + 'styles/archive-container.css',
  BASE_PATH + 'styles/curated-container.css',
  BASE_PATH + 'styles/favorites-container.css',
  BASE_PATH + 'styles/credits-container.css',
  BASE_PATH + 'styles/help-container.css',
  BASE_PATH + 'styles/toast-notification.css',
  BASE_PATH + 'styles/my-mementos-container.css',
  BASE_PATH + 'styles/animations.css',
  BASE_PATH + 'styles/memento-markers.css',
  BASE_PATH + 'scripts/script.js',
  BASE_PATH + 'scripts/firebase-config.js',
  BASE_PATH + 'scripts/firebase-setup.js',
  BASE_PATH + 'scripts/toast-notification.js',
  BASE_PATH + 'scripts/layout.js',
  BASE_PATH + 'scripts/navigation.js',
  BASE_PATH + 'scripts/map-container.js',
  BASE_PATH + 'scripts/auth-container.js',
  BASE_PATH + 'scripts/activities.js',
  BASE_PATH + 'scripts/capture-form.js',
  BASE_PATH + 'scripts/credits-container.js',
  BASE_PATH + 'scripts/curated-container.js',
  BASE_PATH + 'scripts/drafts-container.js',
  BASE_PATH + 'scripts/favorites-container.js',
  BASE_PATH + 'scripts/filter-settings.js',
  BASE_PATH + 'scripts/help-container.js',
  BASE_PATH + 'scripts/info-container.js',
  BASE_PATH + 'scripts/live-feed-container.js',
  BASE_PATH + 'scripts/profile-container.js',
  BASE_PATH + 'scripts/my-mementos.js',
  BASE_PATH + 'scripts/confirmation-dialog.js',
  BASE_PATH + 'data/logo/Logo.svg',
  BASE_PATH + 'data/logo/default-avatar.png',
  'https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.js',
  'https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a success response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
  );
}); 