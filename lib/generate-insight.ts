import type { ReadinessHistoryPoint } from './types/readiness';

export type InsightSeverity = 'warning' | 'info' | 'positive';

export type Insight =
  | { code: 'not_enough_data'; severity: 'info' }
  | { code: 'red_streak'; severity: 'warning'; days: number }
  | { code: 'acwr_spike'; severity: 'warning'; acwr: number }
  | { code: 'monotony'; severity: 'warning' }
  | { code: 'streak_positive'; severity: 'positive'; days: number }
  | { code: 'great_shape'; severity: 'positive' }
  | { code: 'neutral'; severity: 'info' };

/**
 * Deterministic "AI insight" banner — same philosophy as the rest of the
 * Readiness Engine: plain rule-based code, not an LLM call. Every insight
 * is explainable and reproducible from the same 30-day history the athlete
 * already sees in the chart. Claude never generates this text — it can
 * only ever explain numbers the engine already produced, same as the chat
 * integration in lib/get-today-readiness.ts / lib/claude-agent.ts.
 *
 * Rules are checked most-severe-first and the function returns on the
 * first match, so at most one insight is shown at a time.
 */
export function generateInsight(history: ReadinessHistoryPoint[]): Insight {
  const withCheckins = history.filter((p) => p.hasCheckin);
  if (withCheckins.length < 3) {
    return { code: 'not_enough_data', severity: 'info' };
  }

  // Trailing consecutive red-zone days. Only counts days that actually
  // have a check-in — a missing day breaks the streak because we have no
  // real signal for it (better silent than a false alarm from a gap).
  let redStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const point = history[i];
    if (!point.hasCheckin) break;
    if (point.zone !== 'red') break;
    redStreak++;
  }
  if (redStreak >= 3) {
    return { code: 'red_streak', severity: 'warning', days: redStreak };
  }

  const latestWithAcwr = [...history].reverse().find((p) => p.acwr !== null);
  if (latestWithAcwr && latestWithAcwr.acwr !== null && latestWithAcwr.acwr > 1.5) {
    return { code: 'acwr_spike', severity: 'warning', acwr: latestWithAcwr.acwr };
  }

  const latestWithMonotony = [...history].reverse().find((p) => p.monotony !== null);
  if (latestWithMonotony && latestWithMonotony.monotony !== null && latestWithMonotony.monotony > 2) {
    return { code: 'monotony', severity: 'warning' };
  }

  const today = history[history.length - 1];
  if (today?.hasCheckin && today.zone === 'green' && today.trainingStreak >= 10) {
    return { code: 'streak_positive', severity: 'positive', days: today.trainingStreak };
  }

  const last7 = withCheckins.slice(-7);
  const avg7 = last7.length ? last7.reduce((s, p) => s + p.score, 0) / last7.length : 0;
  const redInLast7 = last7.filter((p) => p.zone === 'red').length;
  if (last7.length >= 5 && avg7 >= 80 && redInLast7 === 0) {
    return { code: 'great_shape', severity: 'positive' };
  }

  return { code: 'neutral', severity: 'info' };
}

type InsightDict = {
  insightRedStreak: (n: number) => string;
  insightAcwrSpike: (v: string) => string;
  insightMonotony: string;
  insightStreakPositive: (n: number) => string;
  insightGreatShape: string;
  insightNotEnoughData: string;
  insightNeutral: string;
};

export function insightMessage(insight: Insight, progressT: InsightDict): string {
  switch (insight.code) {
    case 'red_streak':
      return progressT.insightRedStreak(insight.days);
    case 'acwr_spike':
      return progressT.insightAcwrSpike(insight.acwr.toFixed(2));
    case 'monotony':
      return progressT.insightMonotony;
    case 'streak_positive':
      return progressT.insightStreakPositive(insight.days);
    case 'great_shape':
      return progressT.insightGreatShape;
    case 'not_enough_data':
      return progressT.insightNotEnoughData;
    case 'neutral':
    default:
      return progressT.insightNeutral;
  }
}
