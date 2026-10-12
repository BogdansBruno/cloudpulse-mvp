'use client';

// components/PreventZoom.tsx — stops the page from being zoomed by pinch on iPhone/iPad Safari, which ignores user-scalable=no.
//   gesturestart / gesturechange / gestureend  Safari-only events that carry the pinch; cancelling them stops the zoom.
//   touchmove with 2+ fingers                  the same pinch on browsers without those events.
// Double-tap zoom is NOT handled here on purpose: cancelling touchstart would also swallow the second of two quick taps
// on a button. `touch-action: pan-x pan-y` on <html> (app/np-theme.css) already removes that zoom without side effects.
// Renders nothing.

import { useEffect } from 'react';

export default function PreventZoom(): null {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    document.addEventListener('gestureend', stop);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
      document.removeEventListener('gestureend', stop);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
  return null;
}
