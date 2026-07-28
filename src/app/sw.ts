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
    // API routes — never cache
    {
      matcher: ({ request }) => request.url.includes('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// --- Native Web Push Notification Listeners (Même navigateur / PWA fermé) ---

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

    const title = data.title || "GradeUp 🚀";
    const options = {
      body: data.body || "Mbote Il'y a une nouvelle mise à jour de GradeUp.",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/icon-72x72.png",
      vibrate: [300, 100, 300, 100, 300], // Vibreur / Bip puissant natif
      renotify: true,
      tag: "gradeup-broadcast-update",
      requireInteraction: true, // Reste visible jusqu'à interaction
      data: data.data || { url: "/" },
      actions: [
        { action: "open", title: "Ouvrir GradeUp" }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("[ServiceWorker] Error receiving push notification:", error);
  }
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients: any) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
