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
 */
export async function registerPushNotifications(userId: string) {
  if (
    typeof window === 'undefined' || 
    !('serviceWorker' in navigator) || 
    !('PushManager' in window)
  ) {
    console.warn('[PushRegistration] Web Push notifications are not supported on this browser/device.');
    return;
  }

  try {
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.warn('[PushRegistration] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined. Skipping push setup.');
      return;
    }

    // 1. Wait for Service Worker registration to be active
    const registration = await navigator.serviceWorker.ready;

    // 2. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[PushRegistration] Notification permission was denied by the user.');
      return;
    }

    // 3. Subscribing to push manager
    const convertedKey = urlBase64ToUint8Array(publicVapidKey);
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    };

    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe(subscribeOptions);
      console.log('[PushRegistration] Fresh browser push subscription token generated.');
    } else {
      console.log('[PushRegistration] Existing active browser push subscription detected.');
    }

    // 4. Send subscription details to backend api
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
      throw new Error(`Failed to save subscription on server. Status: ${response.status}`);
    }

    console.log('[PushRegistration] Browser push registration successfully synced with server DB.');
  } catch (error) {
    console.error('[PushRegistration] Failed to subscribe browser to Web Push:', error);
  }
}
