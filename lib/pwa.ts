// lib/pwa.ts
//
// Shared bits for installing CloudPulse as an app. Chrome, Edge and Samsung
// Internet fire `beforeinstallprompt` once, often before the page that shows
// the install button is open, so ServiceWorkerRegister (root layout) catches
// it early and parks it here for InstallAppCard. iOS Safari has no such
// event: there the card shows the "Share → Add to Home Screen" steps instead.

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const INSTALLABLE_EVENT = 'cloudpulse:installable';

let deferred: InstallPromptEvent | null = null;

export function setDeferredInstallPrompt(e: InstallPromptEvent | null): void {
  deferred = e;
}

export function getDeferredInstallPrompt(): InstallPromptEvent | null {
  return deferred;
}

/** Already opened from the home screen (installed)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Other iOS browsers (CriOS, FxiOS, EdgiOS) can't add to the home screen the same way.
  return ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}
