'use client';

// components/Haptics.tsx — mounted once in the (main) layout. One passive listener gives every
// tappable thing (buttons, links, radios, tabs, switches) a light tick on press, so no screen has to
// wire it by hand. Scales that tick per step (SegmentedScale, GlowScale) keep their own.

import { useEffect } from 'react';
import { impactLight } from '@/lib/haptics';

const TAPPABLE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="menuitem"], summary';

export default function Haptics() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const el = (e.target as Element | null)?.closest?.(TAPPABLE);
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      // scales and sliders tick per step on their own
      if (el.closest('[role="radiogroup"], [role="slider"]')) return;
      impactLight();
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
  return null;
}
