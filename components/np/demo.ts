// components/np/demo.ts — DEMO wearable values for /demo screens ONLY.
//
// ADP has no wearable source yet: the engine knows the check-in (sleep 1–7,
// stress, fatigue, soreness) and session load (RPE × minutes). Everything
// below is a labelled placeholder that shows what the screen looks like once a
// band/ring is connected. Only /demo screens and the jury demo accounts (profiles.is_demo,
// components/np/useAccount: useIsDemo) may show it, always with the "Demo · needs a wearable" tag.
// Never pass it to a real athlete's screen.

import type { Biometric } from './BiometricsGrid';
import type { SleepStages } from './SleepCard';

/** 22:55 → 07:34 = 519 min in bed: deep 92 + REM 115 + light 255 + awake 57 → asleep 462 min (7 h 42 min),
 *  efficiency 462 / 519 = 89 %. */
export const DEMO_SLEEP: { stages: SleepStages; bedtime: { from: string; to: string }; consistency: number; sleepHrv: number } = {
  stages: { deep: 92, rem: 115, light: 255, awake: 57 },
  bedtime: { from: '22:55', to: '07:34' },
  consistency: 86,
  sleepHrv: 64,
};

/** The demo night in order (stage, minutes), 22:55 → 07:34. Its totals are exactly DEMO_SLEEP.stages
 *  (deep 92, REM 115, light 255, awake 57 = 519 min in bed): five cycles, deep sleep mostly early, REM mostly late. */
export const DEMO_HYPNO: { stage: 'deep' | 'rem' | 'light' | 'awake'; min: number }[] = [
  { stage: 'light', min: 20 }, { stage: 'deep', min: 30 }, { stage: 'light', min: 15 }, { stage: 'rem', min: 10 }, { stage: 'awake', min: 5 },
  { stage: 'light', min: 15 }, { stage: 'deep', min: 28 }, { stage: 'light', min: 20 }, { stage: 'rem', min: 17 }, { stage: 'awake', min: 4 },
  { stage: 'light', min: 30 }, { stage: 'deep', min: 22 }, { stage: 'light', min: 25 }, { stage: 'rem', min: 25 }, { stage: 'awake', min: 18 },
  { stage: 'light', min: 40 }, { stage: 'deep', min: 12 }, { stage: 'light', min: 25 }, { stage: 'rem', min: 28 }, { stage: 'awake', min: 6 },
  { stage: 'light', min: 30 }, { stage: 'rem', min: 35 }, { stage: 'awake', min: 10 }, { stage: 'light', min: 35 }, { stage: 'awake', min: 14 },
];

/** 14 days each, oldest → today; the last point is today's value. Resting HR 52 and HRV 64 match the
 *  heart card on Today (demoHeartDay). */
export const DEMO_BIOMETRICS: Biometric[] = [
  { k: 'hrv', value: 64, lo: 55, hi: 75, dp: 0, hist: [61, 64, 59, 66, 63, 58, 60, 57, 62, 66, 54, 58, 63, 64] },
  { k: 'rhr', value: 52, lo: 48, hi: 58, dp: 0, hist: [53, 52, 54, 51, 50, 53, 55, 55, 54, 56, 53, 55, 54, 52] },
  { k: 'spo2', value: 97, lo: 95, hi: 99, dp: 0, hist: [97, 98, 97, 98, 99, 98, 97, 96, 98, 98, 97, 98, 97, 97] },
  { k: 'temp', value: 0.2, lo: -0.4, hi: 0.4, dp: 1, signed: true, hist: [0.1, 0, -0.1, 0.2, 0.1, -0.2, 0, 0.2, 0.1, -0.1, 0, 0.1, 0.3, 0.2] },
  { k: 'resp', value: 14.2, lo: 13.5, hi: 15.5, dp: 1, hist: [14.0, 14.3, 14.1, 13.9, 14.4, 14.6, 14.2, 14.0, 14.3, 14.5, 14.6, 14.4, 14.3, 14.2] },
];

/** One demo day of heart rate, every 15 min from 00:00 up to `untilMin` (minutes since midnight).
 *  Deterministic shape: a night dip to 48 bpm at 04:15, waking ramp, a school day around 72,
 *  a training peak at 17:15, a calm evening. Resting HR and HRV are fixed demo values (HRV = the
 *  sleep HRV above, so the screens agree). */
export function demoHeartDay(untilMin: number): { points: { min: number; bpm: number }[]; restingBpm: number; hrvMs: number } {
  const bpm = (m: number): number => {
    if (m < 390) return 53 - 5 * Math.exp(-(((m - 255) / 120) ** 2));
    if (m < 480) return 51 + ((m - 390) / 90) * 17;
    const day = 72 + 5 * Math.sin(m / 37) + 70 * Math.exp(-(((m - 1035) / 28) ** 2));
    return m < 1140 ? day : day - ((m - 1140) / 300) * 12;
  };
  const points: { min: number; bpm: number }[] = [];
  for (let m = 0; m <= Math.min(1440, untilMin); m += 15) points.push({ min: m, bpm: Math.round(bpm(m)) });
  return { points, restingBpm: 52, hrvMs: DEMO_SLEEP.sleepHrv };
}

/** "My Health" demo numbers (jury demo accounts only, always tagged "Demo · needs a wearable").
 *  HRV 64 / band 55–75 and resting HR 52 agree with DEMO_BIOMETRICS and the heart card on Today. */
export const DEMO_HEALTH = {
  score: 86,
  cardioAge: 23,
  /** cardio age minus calendar age, in years */
  ageDelta: -3,
  /** "top N % of the age group" */
  topPct: 10,
  vo2: 48,
  /** share of days in the green zone, % */
  recoveryPct: 92,
  /** [days logged, days planned] per period */
  consistency: { d30: [18, 20], d90: [54, 60], y1: [216, 240] } as Record<'d30' | 'd90' | 'y1', [number, number]>,
  hrv: { now: 64, lo: 55, hi: 75 },
  rhrNow: 52,
};

/** One demo day of HRV / resting HR, `daysAgo` days before today (0 = today). A function of the day
 *  offset only — so the last 30 days look the same on every period — with a small fixed wobble.
 *  Today is pinned to the demo values. HRV slowly higher over the last month; resting HR falling
 *  from ~56 to 52 over the last 30 days (mean of those 30 days ≈ 54, so "−2 vs monthly avg"). */
export function demoDay(kind: 'hrv' | 'rhr', daysAgo: number): number {
  if (daysAgo === 0) return kind === 'hrv' ? DEMO_HEALTH.hrv.now : DEMO_HEALTH.rhrNow;
  const wob = Math.sin(daysAgo * 1.7) * 1.6 + Math.sin(daysAgo * 0.63 + 1) * 1.2;
  if (kind === 'hrv') {
    const base = 64 - Math.min(daysAgo, 30) * 0.06 - Math.max(0, daysAgo - 30) * 0.018;
    return Math.round((base + wob * 1.3) * 10) / 10;
  }
  const base = 52 + Math.min(daysAgo, 30) * (4 / 30) + Math.max(0, daysAgo - 30) * 0.02;
  return Math.round((base + wob * 0.6) * 10) / 10;
}

/** `n` demo days, oldest → today. */
export function demoSeries(kind: 'hrv' | 'rhr', n: number): number[] {
  return Array.from({ length: n }, (_, i) => demoDay(kind, n - 1 - i));
}
