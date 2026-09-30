// adp/src/services/drillTimer.ts
//
// The home-session timer: one block at a time, minutes from the plan. When a
// block's time is up it is marked done and the next one is selected, paused —
// the athlete decides when to go on. Nothing is stored: it is a stopwatch,
// not a log. Used by the /training screen and the design studio.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BlockView } from './planView';


export function useDrillTimer(blocks: readonly BlockView[]) {
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(() => (blocks[0]?.minutes ?? 0) * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState<Set<number>>(new Set());
  const key = blocks.map((b) => `${b.kind}:${b.minutes}:${b.drills.map((d) => d.id).join('+')}`).join('|');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // A new plan (the map changed): start over.
  useEffect(() => {
    setIndex(0);
    setLeft((blocks[0]?.minutes ?? 0) * 60);
    setRunning(false);
    setFinished(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(blocks.length - 1, i));
      setIndex(next);
      setLeft((blocks[next]?.minutes ?? 0) * 60);
    },
    [blocks]
  );

  // Block time is up: mark it done and move on (paused, the athlete decides).
  useEffect(() => {
    if (running && left === 0 && blocks.length > 0) {
      setRunning(false);
      setFinished((f) => new Set(f).add(index));
      if (index < blocks.length - 1) goTo(index + 1);
    }
  }, [left, running, index, blocks.length, goTo]);

  return {
    index,
    left,
    running,
    finished,
    total: (blocks[index]?.minutes ?? 0) * 60,
    toggle: () => setRunning((r) => !r),
    next: () => {
      setFinished((f) => new Set(f).add(index));
      setRunning(false);
      goTo(index + 1);
    },
    reset: () => {
      setRunning(false);
      setFinished(new Set());
      goTo(0);
    },
    select: (i: number) => {
      setRunning(false);
      goTo(i);
    },
  };
}

export function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

