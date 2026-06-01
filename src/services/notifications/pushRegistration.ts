/**
 * Utility function to convert VAPID public key base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the browser push manager subscription for the current user and device.
 * Triggers native system notification permission prompt.
 * Silently aborts if push service is unavailable (local dev, HTTP, unsupported browser).
 */
export async function registerPushNotifications(userId: string) {
  if (
    typeof window === 'undefined' || 
    !('serviceWorker' in navigator) || 
    !('PushManager' in window)
  ) {
    // No warning needed — silently ignore in environments that don't support push
    return;
  }

  try {
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      // No warning needed — expected in dev without VAPID keys
      return;
    }

    // 1. Wait for Service Worker registration to be active
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.ready;
    } catch {
      // Service worker not available (HTTP, local dev, etc.) — silently abort
      return;
    }

    // 2. Request user permission
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      return;
    }
    if (permission !== 'granted') {
      return;
    }

    // 3. Subscribing to push manager
    const convertedKey = urlBase64ToUint8Array(publicVapidKey);
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    };

    let subscription: PushSubscription | null = null;
    try {
      subscription = await registration.pushManager.getSubscription();
    } catch {
      return;
    }
    
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe(subscribeOptions);
      } catch {
        // Push service not available (AbortError or other) — silently abort
        return;
      }
    }

    // 4. Send subscription details to backend api
    try {
      const response = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription,
        }),
      });

      if (!response.ok) {
        // Silently fail — not critical
        return;
      }
    } catch {
      // Network error — silently fail
      return;
    }
  } catch {
    // Catch-all — never throw, never log in dev mode
  }
}
