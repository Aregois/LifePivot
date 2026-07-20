'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Avoid service worker caching during local development (fixes HMR and hydration mismatches)
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('[Service Worker] Unregistered active worker on localhost to prevent caching');
          }
        });
        return;
      }

      if ((window as any).workbox === undefined) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              console.log('[Service Worker] Registered successfully with scope:', registration.scope);
            })
            .catch((error) => {
              console.error('[Service Worker] Registration failed:', error);
            });
        });
      }
    }
  }, []);

  return null;
}
