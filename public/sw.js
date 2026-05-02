// Service Worker for Playlist Party
// Cache version - increment this to force cache refresh
const CACHE_VERSION = 'v2';
const CACHE_NAME = `playlist-party-${CACHE_VERSION}`;

// Time before falling back to cache when the network is slow/hanging.
// Android PWAs can hang on the splash screen if a launch fetch never resolves.
const NETWORK_TIMEOUT_MS = 4000;

// Assets to cache (minimal - we use network-first for everything)
const STATIC_ASSETS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Install event - cache minimal static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Caching static assets');
      await cache.addAll(STATIC_ASSETS);
      // Skip waiting to activate immediately
      await self.skipWaiting();
    })(),
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
      // Take control of all pages immediately
      await self.clients.claim();
    })(),
  );
});

// Fetch event - Network-first strategy for all requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always bypass cache for API routes and dynamic content
  if (
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET' ||
    url.pathname.includes('/_next/data/')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first with a timeout fallback to cache.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Network timeout')),
          NETWORK_TIMEOUT_MS,
        );
      });
      // Prevent unhandled rejection if the orphan timeout fires after a fast response.
      timeoutPromise.catch(() => {});

      const networkPromise = fetch(request).then(
        (response) => {
          clearTimeout(timeoutId);
          // Update the cache in the background so future fallbacks stay fresh,
          // even if we already returned the cached response on timeout.
          if (response.status === 200) {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        },
        (error) => {
          clearTimeout(timeoutId);
          throw error;
        },
      );

      try {
        return await Promise.race([networkPromise, timeoutPromise]);
      } catch (error) {
        console.error(
          '[SW] Fetch failed or timed out; returning cached resource if available.',
          error,
        );

        // Don't let an eventual network failure surface as an unhandled rejection.
        networkPromise.catch(() => {});

        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Return a basic offline page for navigation requests
        if (request.mode === 'navigate') {
          return new Response(
            '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } },
          );
        }

        throw new Error('Network request failed and no cache available');
      }
    })(),
  );
});

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName)),
        );
        event.ports[0].postMessage({ success: true });
      })(),
    );
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, data, delay } = event.data.payload;

    const sendNotification = () => {
      event.waitUntil(
        self.registration.showNotification(title, {
          body,
          icon: icon || '/icon-192.png',
          badge: '/icon-192.png',
          tag: data?.link || 'notification',
          data: data || {},
          requireInteraction: false,
          silent: false,
        }),
      );
    };

    if (delay && typeof delay === 'number') {
      setTimeout(() => {
        sendNotification();
      }, delay);
    } else {
      sendNotification();
    }
  }
});

// Notification click event - open the app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data?.link || '/';

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })(),
  );
});

// Push event - handle push notifications from server via VAPID
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (event.data) {
    const payload = event.data.json();
    const { title, body, icon, data } = payload;

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: data?.link || 'notification',
        data: data || {},
        requireInteraction: false,
        silent: false,
      }),
    );
  }
});
