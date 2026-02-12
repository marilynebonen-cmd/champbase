/**
 * Service Worker Registration
 * 
 * This registers the service worker for PWA functionality.
 * Call this in your app initialization (e.g., layout.tsx useEffect)
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Try next-pwa generated service worker first
        let registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        
        console.log('[PWA] Service worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New service worker available, will update');
                // Optionally show a toast/notification to user
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

      } catch (error) {
        // If next-pwa sw.js doesn't exist, try manual service worker
        console.log('[PWA] Trying manual service worker...');
        
        try {
          const registration = await navigator.serviceWorker.register('/sw-manual.js', {
            scope: '/',
          });
          console.log('[PWA] Manual service worker registered:', registration.scope);
        } catch (manualError) {
          console.warn('[PWA] Service worker registration failed:', manualError);
        }
      }
    });

    // Reload page when service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  } else {
    console.warn('[PWA] Service workers not supported in this browser');
  }
}

/**
 * Unregister all service workers (for testing/debugging)
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[PWA] Service worker unregistered');
    }
  }
}

/**
 * Check if app is running in standalone mode (installed as PWA)
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true || // iOS
    document.referrer.includes('android-app://') // Android
  );
}

/**
 * Check if service worker is registered and active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.active !== null;
}
