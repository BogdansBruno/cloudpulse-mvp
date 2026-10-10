'use client';

// components/np/tags.ts — daily factor tags (late meal, caffeine …) and the small "correlation engine" behind them.
//
// Tags are stored ONLY on this device (localStorage, `lotus.tags.v1`: { "2026-10-06": ["lateMeal"] }) — nothing leaves the
// phone (GDPR minimisation). The jury demo accounts get a deterministic set of demo tags over the labelled demo history.
//
// The engine compares the MORNING AFTER a tagged day with the morning after every other day, on the athlete's own
// check-in numbers (readiness, sleep rating, calm rating). It needs ≥ 3 tagged and ≥ 3 other days with a value, and it
// never says "because": it reports an average gap between two groups of the athlete's own days.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import { UX, type TagKey } from './uxCopy';

export const TAG_KEYS: TagKey[] = ['lateMeal', 'alcohol', 'caffeine', 'sauna', 'highStress', 'hardWorkout'];
export type TagMap = Record<string, TagKey[]>;
export type TagMetric = 'readiness' | 'sleep' | 'stress';

const STORE = 'lotus.tags.v1';

export const isoDay = (d: Date): string => iso(d);
const iso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const nextDay = (date: string): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return iso(d);
};

export const prevDay = (date: string): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return iso(d);
};

/** Deterministic demo tags over the last 60 days (jury demo accounts only; labelled "Demo tags" on screen). */
export function demoTags(): TagMap {
  const out: TagMap = {};
  const t = new Date();
  for (let i = 1; i <= 60; i++) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    const tags: TagKey[] = [];
    if (i % 6 === 1) tags.push('lateMeal');
    if (i % 4 === 2) tags.push('caffeine');
    if (i % 9 === 3) tags.push('sauna');
    if (i % 11 === 5) tags.push('hardWorkout');
    if (tags.length) out[iso(d)] = tags;
  }
  return out;
}

function readStore(): TagMap {
  try {
    const raw = window.localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as TagMap) : {};
  } catch {
    return {};
  }
}

/** Today's tags + all stored days. `today` is the app's own "today" (YYYY-MM-DD). */
export function useTags(today: string, demo: boolean): { active: TagKey[]; all: TagMap; toggle: (k: TagKey) => void } {
  const [stored, setStored] = useState<TagMap>({});
  useEffect(() => setStored(readStore()), []);
  const toggle = useCallback(
    (k: TagKey) => {
      setStored((prev) => {
        const cur = prev[today] ?? [];
        const next = { ...prev, [today]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] };
        if (!next[today].length) delete next[today];
        try {
          window.localStorage.setItem(STORE, JSON.stringify(next));
        } catch {
          /* storage unavailable: tags still work for this visit */
        }
        return next;
      });
    },
    [today],
  );
  const all = useMemo<TagMap>(() => (demo ? { ...demoTags(), ...stored } : stored), [demo, stored]);
  return { active: all[today] ?? [], all, toggle };
}

const valueOf = (p: ReadinessHistoryPoint, m: TagMetric): number | null => {
  if (!p.hasCheckin) return null;
  return m === 'readiness' ? p.score : m === 'sleep' ? p.sleepQuality : p.stress;
};
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** One sentence per active tag (or one "not enough days" line) about how the next mornings differ. */
export function tagImpacts(history: ReadinessHistoryPoint[] | null, all: TagMap, active: TagKey[], metric: TagMetric, lang: Lang): string[] {
  if (!history || active.length === 0) return [];
  const u = UX[lang];
  const byDate = new Map(history.map((p) => [p.date, p]));
  const out: string[] = [];
  let thin = false;
  for (const tag of active) {
    const a: number[] = [];
    const b: number[] = [];
    for (const p of history) {
      const next = byDate.get(nextDay(p.date));
      const v = next ? valueOf(next, metric) : null;
      if (v === null) continue;
      ((all[p.date] ?? []).includes(tag) ? a : b).push(v);
    }
    if (a.length < 3 || b.length < 3) {
      thin = true;
      continue;
    }
    const dp = metric === 'readiness' ? 0 : 1;
    const ma = mean(a);
    const mb = mean(b);
    const diff = Number((ma - mb).toFixed(dp));
    const d = `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${Math.abs(diff).toFixed(dp)}`;
    out.push(u.impact.sentence(u.tags.names[tag], a.length, u.impact.metric[metric], ma.toFixed(dp), mb.toFixed(dp), d));
  }
  if (thin && out.length === 0) out.push(u.impact.notEnough);
  return out;
}
