// Service Worker — Resto SaaS PWA + Push Notifications + Offline Cache

const CACHE_NAME = "resto-saas-v2";
const STATIC_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
];

// Install : précache les assets essentiels
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate : nettoyage des vieux caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : stale-while-revalidate pour les pages menu (/r/*)
// Network-first pour les API, cache-first pour les assets statiques
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes non-GET
  if (event.request.method !== "GET") return;

  // API : toujours réseau, pas de cache
  if (url.pathname.startsWith("/api/")) return;

  // Pages menu restaurant : stale-while-revalidate
  if (url.pathname.startsWith("/r/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Assets statiques (_next/static) : cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});

// Push notification reçue
self.addEventListener("push", (event) => {
  let data = { title: "Nouvelle commande", body: "", url: "/dashboard/orders" };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // ignore JSON parse errors
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: "new-order",
    renotify: true,
    requireInteraction: true,
    data: { url: data.url },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Clic sur la notification → ouvrir la page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard/orders";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
