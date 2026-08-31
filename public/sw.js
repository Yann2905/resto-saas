// Service Worker — Notifications push & cache minimal
// Version : 2

const CACHE_NAME = "resto-saas-v2";

// Install — pré-cache les assets essentiels
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/favicon-32.png", "/icon-192.png", "/manifest.json"])
    )
  );
});

// Activate — supprimer les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Push — afficher la notification
self.addEventListener("push", (event) => {
  let data = { title: "Nouvelle commande", body: "" };
  try {
    if (event.data) {
      const json = event.data.json();
      data.title = json.title || data.title;
      data.body = json.body || data.body;
      data.url = json.url;
    }
  } catch {
    // fallback
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: "order-notification",
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || "/dashboard/orders" },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click — ouvrir l'app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard/orders";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Si un onglet est déjà ouvert, le focus
      for (const client of clients) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      // Sinon, ouvrir un nouvel onglet
      return self.clients.openWindow(url);
    })
  );
});

// Fetch — network first, cache fallback pour la navigation
self.addEventListener("fetch", (event) => {
  // Ne pas intercepter les requêtes API ou les WebSocket
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("supabase") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache les réponses statiques
        if (response.ok && event.request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
