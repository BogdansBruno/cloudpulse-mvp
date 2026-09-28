'use client';

import { useEffect } from 'react';
import { setDeferredInstallPrompt, INSTALLABLE_EVENT, type InstallPromptEvent } from '@/lib/pwa';

// Registers public/sw.js (offline support) and keeps the browser's install
// prompt for InstallAppCard. Production only: in `npm run dev` a service
// worker would serve stale files and make local testing confusing.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own button instead of the browser's mini-bar
      setDeferredInstallPrompt(e as InstallPromptEvent);
      window.dispatchEvent(new Event(INSTALLABLE_EVENT));
    };
    const onInstalled = () => {
      setDeferredInstallPrompt(null);
      window.dispatchEvent(new Event(INSTALLABLE_EVENT));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        // No offline support this time (e.g. private mode); the app still works online.
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return null;
}
