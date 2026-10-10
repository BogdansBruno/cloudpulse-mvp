'use client';

// components/np/notices.ts — tiny shared store for quiet, non-critical notices.
// A page raises one (e.g. SafetyShield: "could not check the pass status"); the shell shows it as a
// small dot on the profile avatar and Settings spells it out — instead of a banner on the dashboard.
// Critical states (a real Safety Pass block) are NOT notices: they keep their own card.

import { useSyncExternalStore } from 'react';

export type NoticeKey = 'passCheck';
type State = Record<NoticeKey, boolean>;

let state: State = { passCheck: false };
const listeners = new Set<() => void>();

export function setNotice(key: NoticeKey, on: boolean): void {
  if (state[key] === on) return;
  state = { ...state, [key]: on };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useNotices(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
