const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA
  ?? process.env.BUILD_ID
  ?? Date.now().toString(36);

const SW_BODY = /* js */ `
// Service Worker — Resto SaaS PWA
// Build: ${"{BUILD_ID}"}

const CACHE_NAME = "resto-saas-" + "${"{BUILD_ID}"}";
const STATIC_ASSETS = ["/icon-192.png", "/icon-512.png", "/manifest.json"];

// ── Install ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate : purge old caches + notify clients ────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((cls) =>
          cls.forEach((c) => c.postMessage({ type: "SW_UPDATED" }))
        )
      )
  );
});

// ── Fetch : network-first for pages, cache-fallback for assets ──
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  // HTML navigation: always network-first
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match("/dashboard/orders")))
    );
    return;
  }

  // Static assets (_next/static): cache-first (content-hashed URLs)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Menu pages (/r/*): network-first with cache fallback
  if (url.pathname.startsWith("/r/")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});

// ── Push notifications ──────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Nouvelle commande", body: "", url: "/dashboard/orders" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200, 100, 200],
      tag: "new-order",
      renotify: true,
      requireInteraction: true,
      data: { url: data.url },
    }).then(() => {
      if (navigator.setAppBadge) {
        return self.registration.getNotifications().then((n) => navigator.setAppBadge(n.length + 1));
      }
    })
  );
});

// ── Notification click ──────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard/orders";
  event.waitUntil(
    Promise.all([
      navigator.clearAppBadge ? navigator.clearAppBadge() : Promise.resolve(),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            client.postMessage({ type: "REFRESH_ORDERS" });
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
    ])
  );
});
`.trim();

export async function GET() {
  const body = SW_BODY.replace(/\{BUILD_ID\}/g, BUILD_ID);
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
