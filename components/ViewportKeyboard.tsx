'use client';

// components/ViewportKeyboard.tsx — keeps the screen still when the phone keyboard opens.
// On iPhone the keyboard does not shrink the page, it slides over it, and the browser then scrolls and drifts things around.
// This watches the visible area (visualViewport): it writes its height to --vvh and, while a keyboard is open, sets data-kb on <html>.
// CSS does the rest: the bottom dock hides ([data-kb-hide]) and the chat box is sized to the visible area, so the input stays put.
// Renders nothing. Phones only (width < 768); on a desktop window the numbers never differ.

import { useEffect } from 'react';

const KEYBOARD_MIN_PX = 120;

export default function ViewportKeyboard(): null {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const open = window.innerWidth < 768 && window.innerHeight - vv.height > KEYBOARD_MIN_PX;
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      if (open) root.setAttribute('data-kb', '');
      else root.removeAttribute('data-kb');
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.removeAttribute('data-kb');
      root.style.removeProperty('--vvh');
    };
  }, []);
  return null;
}
