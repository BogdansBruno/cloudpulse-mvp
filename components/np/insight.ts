// components/np/insight.ts — turns engine numbers into the InsightInput of CoachInsight.

import type { PenaltyCode, ReadinessZone } from '@/lib/readiness-engine';
import { loadZone, targetLoadRange } from '@/lib/load-index';
import type { InsightInput } from './copy';

export function buildInsight(v: {
  score: number | null;
  zone: ReadinessZone | null;
  delta: number | null;
  yesterdayIndex: number | null;
  acwr: number | null;
  penalties: PenaltyCode[];
  locale: string;
}): InsightInput | null {
  if (v.score === null || v.zone === null) return null;
  return {
    score: v.score,
    zone: v.zone,
    delta: v.delta,
    yesterdayIndex: v.yesterdayIndex,
    yesterdayZone: v.yesterdayIndex !== null ? loadZone(v.yesterdayIndex) : null,
    acwr: v.acwr !== null ? new Intl.NumberFormat(v.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v.acwr) : null,
    penalties: v.penalties,
    target: targetLoadRange(v.score),
  };
}
