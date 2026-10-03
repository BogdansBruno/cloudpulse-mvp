// lib/load-index.ts
//
// ADP Load Index (0–100) — our own day-load scale, replacing the 0–21 range.
// It is built ONLY from numbers the engine already has (session RPE × minutes
// and the usual week from lib/readiness-engine.ts), so it can be explained
// to a coach in one sentence:
//
//   index = 50 × (today's session load ÷ your usual day),  capped at 100
//   usual day = usual week (mean weekly load over 28 days) ÷ 7
//
//   50  = an ordinary day for THIS athlete
//   ≤40 = Light / recovery   (below 0.8 × usual day — same 0.8 as ACWR "low")
//   41–75 = Optimal          (0.8 … 1.5 × usual day)
//   76–100 = Overload        (above 1.5 × usual day — same 1.5 as ACWR "spike")
//
// Target for today comes from the readiness score of the engine:
//   upper = min(score, 75)   (ADP never recommends the overload zone)
//   lower = max(0, upper − 15)
// e.g. readiness 58 → 43–58, readiness 90 → 60–75, readiness 40 → 25–40.
// It is guidance for the athlete and the coach, not a medical rule.

export type LoadZone = 'light' | 'optimal' | 'overload';

export const LOAD_ZONES: readonly { key: LoadZone; from: number; to: number }[] = [
  { key: 'light', from: 0, to: 40 },
  { key: 'optimal', from: 41, to: 75 },
  { key: 'overload', from: 76, to: 100 },
];

/** Index of an ordinary day. */
export const LOAD_INDEX_USUAL = 50;
const TARGET_CAP = 75;
const TARGET_WIDTH = 15;

/** Usual daily load (AU) from the engine's usual week. null while the base is still building. */
export function usualDailyLoad(chronicWeekLoad: number | null | undefined): number | null {
  if (chronicWeekLoad === null || chronicWeekLoad === undefined || !Number.isFinite(chronicWeekLoad) || chronicWeekLoad <= 0) return null;
  return chronicWeekLoad / 7;
}

/** 0–100. null when there is no usual day yet (new athlete) or no data. */
export function loadIndex(dailyLoad: number | null | undefined, usualDay: number | null | undefined): number | null {
  if (dailyLoad === null || dailyLoad === undefined || !Number.isFinite(dailyLoad) || dailyLoad < 0) return null;
  if (usualDay === null || usualDay === undefined || !Number.isFinite(usualDay) || usualDay <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((LOAD_INDEX_USUAL * dailyLoad) / usualDay)));
}

export function loadZone(index: number): LoadZone {
  if (index <= 40) return 'light';
  if (index <= 75) return 'optimal';
  return 'overload';
}

/** Recommended load corridor for today from the readiness score (0–100). */
export function targetLoadRange(readinessScore: number | null | undefined): { from: number; to: number } | null {
  if (readinessScore === null || readinessScore === undefined || !Number.isFinite(readinessScore)) return null;
  const to = Math.max(0, Math.min(TARGET_CAP, Math.round(readinessScore)));
  return { from: Math.max(0, to - TARGET_WIDTH), to };
}

/**
 * Today's readiness against the athlete's own average over previous days.
 * `previous` = scores of earlier days WITH a check-in (oldest → newest).
 * null when there are fewer than 3 earlier days — too little to compare.
 */
export function baselineDelta(score: number | null | undefined, previous: readonly number[]): { delta: number; mean: number; days: number } | null {
  if (score === null || score === undefined || previous.length < 3) return null;
  const mean = previous.reduce((a, b) => a + b, 0) / previous.length;
  return { delta: Math.round(score - mean), mean: Math.round(mean), days: previous.length };
}
