// components/np/status.ts — the Lotus colour system and how engine results map onto it.
//
// One palette for every screen (rings, badges, charts, zones): high-chroma status colours —
// volt, neon mint, amber, coral, safety red — on a deep charcoal canvas; white text. The engine keeps its own thresholds (readiness zones 75 / 50, Load Index 40 / 75,
// sleep rating 1–7); this file only decides which colour word a result wears. Nothing here changes
// a number or a recommendation.

import type { ReadinessZone } from '@/lib/readiness-engine';
import { loadZone } from '@/lib/load-index';

/** The Lotus palette: a charcoal canvas with high-chroma neon accents (sports-school / safety-pass look). */
export const LT = {
  // score & health state
  optimal: '#B8F23C', // volt — OPTIMAL / Push
  good: '#3FE0A8', // neon mint — GOOD
  fair: '#FFC53D', // amber — FAIR / Steady, load corridors on charts
  neutral: '#9AA7B8', // cool slate — tracks, baselines, light days
  attention: '#FF7A59', // hot coral-orange — NEEDS CARE
  // daytime state & exertion
  engaged: '#F25CA8', // magenta — live workout, Z5 effort
  relax: '#8E8CFF', // electric periwinkle — rest timers, cooldown, sleep
  crimson: '#FF3D5A', // safety red — red zone, stop controls, critical alerts, Safety Pass
  // canvas & text
  bg: '#0B0D11',
  text: '#FFFFFF',
  text2: '#C3C5C7',
} as const;

/** Heart-rate zones Z1…Z5. */
export const HR_ZONE_HEX: [string, string, string, string, string] = [LT.relax, LT.optimal, LT.good, LT.attention, LT.engaged];

export type Status = 'optimal' | 'good' | 'fair' | 'light' | 'attention';

/** Colour of a status (pills, text). `light` = a light day / below usual → warm sand. */
export const STATUS_HEX: Record<Status, string> = {
  optimal: LT.optimal,
  good: LT.good,
  fair: LT.fair,
  light: LT.neutral,
  attention: LT.attention,
};

/** Ring arc gradients: [start, end] — brighter at the head of the arc. */
export const STATUS_GRADIENT: Record<Status, [string, string]> = {
  optimal: ['#6FB81F', LT.optimal],
  good: ['#1FA97C', LT.good],
  fair: ['#E39A00', LT.fair],
  light: ['#6B7686', LT.neutral],
  attention: ['#D9502F', LT.attention],
};

/** A 0–100 score → status: 85–100 optimal · 70–84 good · 60–69 fair · < 60 pay attention.
 *  Colour only — the engine zone (green ≥ 75 / yellow 50–74 / red < 50) still drives every
 *  headline, load target and recommendation. */
export function scoreStatus(score: number): Status {
  return score >= 85 ? 'optimal' : score >= 70 ? 'good' : score >= 60 ? 'fair' : 'attention';
}

/** Engine zone → status, for places that only know the zone (no score). */
export function readinessStatus(zone: ReadinessZone): Status {
  return zone === 'green' ? 'optimal' : zone === 'yellow' ? 'fair' : 'attention';
}

/** Check-in sleep rating 1–7 (7 = best): 6–7 good, 4–5 fair, 1–3 pay attention. */
export function sleepStatus(rating: number): Status {
  return rating >= 6 ? 'good' : rating >= 4 ? 'fair' : 'attention';
}

/** ADP Load Index zones: ≤ 40 light, 41–75 optimal, ≥ 76 overload (= pay attention). */
export function loadStatus(index: number): Status {
  const z = loadZone(index);
  return z === 'optimal' ? 'optimal' : z === 'light' ? 'light' : 'attention';
}

/** Status pills must pop on the dark card: a solid semi-transparent fill + a high-contrast text colour.
 *  Optimal  → bg volt/15  text volt        Needs care → bg coral/20  text lighter coral */
const BADGE_TEXT: Record<string, string> = {
  '#FF7A59': '#FFA58C', // coral-orange → lighter
  '#FF3D5A': '#FF8C9C', // safety red → lighter
  '#9AA7B8': '#C3CCD8', // slate → lighter
};
const BADGE_FILL: Record<string, string> = { '#FF7A59': '33', '#FF3D5A': '33' }; // 20 % for the warm tones, 15 % otherwise

/** Badge / chip look for a colour, as an inline style: semi-transparent fill, readable text, hairline border. */
export function chipStyle(color: string): { color: string; backgroundColor: string; borderColor: string } {
  const key = color.toUpperCase();
  return { color: BADGE_TEXT[key] ?? color, backgroundColor: `${color}${BADGE_FILL[key] ?? '26'}`, borderColor: `${color}4d` };
}
