import type { MetadataRoute } from 'next';

// Web app manifest (served by Next.js at /manifest.webmanifest). Lets
// athletes install CloudPulse on the home screen like an app; opening it
// goes straight to the daily check-in, the one screen that also works offline.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'CloudPulse',
    short_name: 'CloudPulse',
    description: 'Daily readiness check-in and injury-prevention coach for young athletes',
    start_url: '/checkin',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#07080A',
    theme_color: '#07080A',
    lang: 'lv',
    categories: ['health', 'fitness', 'sports'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
