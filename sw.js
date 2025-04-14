const CACHE_NAME = 'memento-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles/memento-details.css',
  '/styles/layout.css',
  '/styles/navigation.css',
  '/styles/map-container.css',
  '/styles/marker.css',
  '/styles/filter-settings.css',
  '/styles/profile-container.css',
  '/styles/auth-container.css',
  '/styles/capture-form.css',
  '/styles/info-container.css',
  '/styles/live-feed-container.css',
  '/styles/drafts-container.css',
  '/styles/archive-container.css',
  '/styles/curated-container.css',
  '/styles/favorites-container.css',
  '/styles/credits-container.css',
  '/styles/help-container.css',
  '/styles/toast-notification.css',
  '/styles/my-mementos-container.css',
  '/styles/animations.css',
  '/styles/memento-markers.css',
  '/scripts/script.js',
  '/scripts/firebase-config.js',
  '/scripts/firebase-setup.js',
  '/scripts/toast-notification.js',
  '/scripts/layout.js',
  '/scripts/navigation.js',
  '/scripts/map-container.js',
  '/scripts/auth-container.js',
  '/scripts/activities.js',
  '/scripts/capture-form.js',
  '/scripts/credits-container.js',
  '/scripts/curated-container.js',
  '/scripts/drafts-container.js',
  '/scripts/favorites-container.js',
  '/scripts/filter-settings.js',
  '/scripts/help-container.js',
  '/scripts/info-container.js',
  '/scripts/live-feed-container.js',
  '/scripts/profile-container.js',
  '/scripts/my-mementos.js',
  '/scripts/confirmation-dialog.js',
  '/data/logo/Logo.svg',
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