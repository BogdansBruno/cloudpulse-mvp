'use client';

// components/np/useMode.ts — the two experience modes of Lotus.
//
//   athlete  (default)  the simple view: readiness, sleep, check-in, three colour bands (Push · Steady · Recover).
//                       ACWR, monotony, Hooper and load numbers are translated into one plain sentence.
//   pro                 the full telemetry: tables, ACWR curve, load distribution, monotony, team sync.
//
// The choice is stored ONLY on this device (localStorage `lotus.mode.v1`). A coach account starts in Pro until it picks
// otherwise. useSyncExternalStore keeps every mounted screen in step when the switch in Settings is flipped.

import { useCallback, useSyncExternalStore } from 'react';
import type { NavRole } from './nav';

export type Mode = 'athlete' | 'pro';
const KEY = 'lotus.mode.v1';
const listeners = new Set<() => void>();

function read(): Mode | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'pro' || v === 'athlete' ? v : null;
  } catch {
    return null;
  }
}
const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
};
// '' = nothing stored yet (server render and first client render agree on it, then the real value is read).
const snapshot = (): string => read() ?? '';
const server = (): string => '';

/** Current mode + setter. `role` only decides the default while nothing has been chosen. */
export function useMode(role: NavRole = 'athlete'): { mode: Mode; isPro: boolean; chosen: boolean; setMode: (m: Mode) => void } {
  const raw = useSyncExternalStore(subscribe, snapshot, server);
  const mode: Mode = raw === 'pro' || raw === 'athlete' ? raw : role === 'coach' ? 'pro' : 'athlete';
  const setMode = useCallback((m: Mode) => {
    try {
      window.localStorage.setItem(KEY, m);
    } catch {
      /* storage unavailable: the choice lasts until reload only */
    }
    listeners.forEach((l) => l());
  }, []);
  return { mode, isPro: mode === 'pro', chosen: raw !== '', setMode };
}
