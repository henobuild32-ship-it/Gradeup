import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.url.includes('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// --- Native Web Push Notification Listeners (works when site/PWA is closed) ---

self.addEventListener("push", (event: any) => {
  try {
    let data: any = {};
    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        data = { body: event.data.text() };
      }
    }

    const title = data.title || "GradeUp";
    const options = {
      body: data.body || "Nouvelle notification de GradeUp.",
      icon: data.icon || "/icon-192x192.png",
      badge: data.badge || "/icon-192x192.png",
      vibrate: [200, 100, 200],
      renotify: true,
      tag: data.tag || "gradeup-notification",
      requireInteraction: true,
      data: data.data || { url: "/" },
      actions: [
        { action: "open", title: "Ouvrir" },
        { action: "dismiss", title: "Fermer" }
      ],
      silent: false,
    };

    event.waitUntil(
      self.registration.showNotification(title, options).then(() => {
        // Envoyer un message aux clients ouverts pour mettre à jour le compteur
        return self.clients.matchAll({ type: "window" }).then((clients: any) => {
          clients.forEach((client: any) => {
            client.postMessage({
              type: "PUSH_NOTIFICATION_RECEIVED",
              data: data,
            });
          });
        });
      })
    );
  } catch (error) {
    console.error("[SW] Push notification error:", error);
  }
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients: any) => {
      // Focus existing window if available
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ("focus" in client) {
          client.focus();
          if (client.navigate) {
            return client.navigate(urlToOpen);
          }
          return client;
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close (analytics tracking opportunity)
self.addEventListener("notificationclose", (event: any) => {
  // Optional: track notification dismissal
});
