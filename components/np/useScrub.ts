'use client';

// components/np/useScrub.ts — finger-friendly reading of a chart: tap OR drag across it and the nearest point is selected.
//
//   • the whole chart area is the hit area: every x position belongs to its nearest bar / point, so a thin 2-3 px bar
//     is as easy to hit as a 28 px button (the callers also draw a visible "active column" behind the selection)
//   • touch: the finger is captured on press, so a drag keeps scrubbing even when it leaves the chart sideways;
//     vertical swipes still scroll the page (the charts set `touch-pan-y`); the selection stays after the finger lifts
//   • mouse: hover reads, leaving the chart clears
//
// `onMove` gets the pointer position as a fraction (0 … 1) of the element's width and returns the index it selected;
// every change of that index while a finger is down gives a light tap (navigator.vibrate — Android; iOS Safari has no web haptics).

import { useRef, type PointerEvent } from 'react';

export type ScrubHandlers = {
  onPointerDown: (e: PointerEvent<Element>) => void;
  onPointerMove: (e: PointerEvent<Element>) => void;
  onPointerUp: (e: PointerEvent<Element>) => void;
  onPointerCancel: (e: PointerEvent<Element>) => void;
  onPointerLeave: (e: PointerEvent<Element>) => void;
};

/** one light tap, when the device has a vibration motor (silently nothing otherwise) */
export function impactLight(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(8);
  } catch {
    /* no haptics */
  }
}

/** a firmer tap for the first touch of a chart (the point "snaps") */
export function impactMedium(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(14);
  } catch {
    /* no haptics */
  }
}

export function useScrub(onMove: (frac: number) => number | null | void, onClear: () => void): ScrubHandlers {
  const pressed = useRef(false);
  const last = useRef<number | null>(null);
  const read = (e: PointerEvent<Element>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width <= 0) return;
    const idx = onMove(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    if (typeof idx === 'number' && idx !== last.current) {
      if (last.current !== null && e.pointerType !== 'mouse') impactLight();
      last.current = idx;
    }
  };
  return {
    onPointerDown: (e) => {
      pressed.current = true;
      if (e.pointerType !== 'mouse') {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* not capturable: scrubbing still works while the finger stays on the chart */
        }
      }
      if (e.pointerType !== 'mouse') impactMedium();
      read(e);
    },
    onPointerMove: (e) => {
      if (e.pointerType === 'mouse' || pressed.current) read(e);
    },
    onPointerUp: () => {
      pressed.current = false;
      last.current = null;
    },
    onPointerCancel: () => {
      pressed.current = false;
      last.current = null;
    },
    onPointerLeave: (e) => {
      if (e.pointerType === 'mouse') onClear();
    },
  };
}
