// components/np/demo.ts — DEMO wearable values for /demo screens ONLY.
//
// ADP has no wearable source yet: the engine knows the check-in (sleep 1–7,
// stress, fatigue, soreness) and session load (RPE × minutes). Everything
// below is a labelled placeholder that shows what the screen looks like once a
// band/ring is connected. Never pass it to a real athlete's screen.

import type { Biometric } from './BiometricsGrid';
import type { SleepStages } from './SleepCard';

/** 23:10 → 06:25 = 435 min in bed: deep 102 + REM 125 + light 178 + awake 30. */
export const DEMO_SLEEP: { stages: SleepStages; bedtime: { from: string; to: string }; consistency: number; sleepHrv: number } = {
  stages: { deep: 102, rem: 125, light: 178, awake: 30 },
  bedtime: { from: '23:10', to: '06:25' },
  consistency: 86,
  sleepHrv: 64,
};

/** 14 days each, oldest → today; the last point is today's value. */
export const DEMO_BIOMETRICS: Biometric[] = [
  { k: 'hrv', value: 66, lo: 52, hi: 68, dp: 0, hist: [61, 64, 59, 66, 63, 58, 55, 57, 62, 60, 56, 54, 59, 66] },
  { k: 'rhr', value: 55, lo: 48, hi: 56, dp: 0, hist: [53, 52, 54, 51, 50, 53, 55, 54, 52, 51, 53, 54, 56, 55] },
  { k: 'spo2', value: 97, lo: 95, hi: 99, dp: 0, hist: [97, 98, 97, 98, 99, 98, 97, 96, 98, 98, 97, 98, 97, 97] },
  { k: 'temp', value: 0.3, lo: -0.4, hi: 0.4, dp: 1, signed: true, hist: [0.1, 0, -0.1, 0.2, 0.1, -0.2, 0, 0.2, 0.1, -0.1, 0, 0.2, 0.3, 0.3] },
  { k: 'resp', value: 15.1, lo: 13.6, hi: 15.0, dp: 1, hist: [14.0, 14.3, 14.1, 13.9, 14.4, 14.6, 14.2, 14.0, 14.3, 14.5, 14.6, 14.8, 14.9, 15.1] },
];
