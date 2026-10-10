// lib/haptics.ts — one tiny tactile tick for taps and selections.
// Android / Chrome: navigator.vibrate. iOS 18 Safari has no vibrate API, but toggling a hidden
// <input type="checkbox" switch> through its label gives the system's light "selection" tick,
// so that is used there. Everywhere else (desktop, older iOS) it silently does nothing.
// Never throws; off for users who asked the system for reduced motion.

let ticker: HTMLLabelElement | null = null;

function reduced(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function iosTicker(): HTMLLabelElement | null {
  if (typeof document === 'undefined') return null;
  if (ticker && document.body.contains(ticker)) return ticker;
  try {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    ticker = label;
    return label;
  } catch {
    return null;
  }
}

/** Light impact: buttons, cards, toggles. */
export function impactLight(): void {
  if (reduced()) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
      return;
    }
    iosTicker()?.click();
  } catch {
    // no haptics on this device
  }
}

/** Selection change: a step on a scale, a tab, a segment. */
export function selectionChanged(): void {
  if (reduced()) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(5);
      return;
    }
    iosTicker()?.click();
  } catch {
    // no haptics on this device
  }
}
