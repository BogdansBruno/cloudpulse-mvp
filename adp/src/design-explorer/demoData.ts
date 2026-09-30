// adp/src/design-explorer/demoData.ts
//
// One demo athlete for all three directions, so the comparison is fair: the
// same readiness, the same pass, the same plan. The plan is NOT drawn by hand
// — it is built by the real coach module (limits → catalogue → rules-only
// plan), from the soreness map the viewer marks in the studio.

import type { AdpLang } from '../components/labels';
import type { SorenessMap } from '../components/sorenessMap';
import type { EngineLimits } from '../types/sportProfile';
import { buildCoachingPrompt } from '../services/AIPromptBuilder';
import { fallbackPlan } from '../services/planGuard';
import { buildPlanView, type PlanView } from '../services/planView';

export type DemoReadiness = {
  score: number;
  zone: 'green' | 'yellow' | 'red';
  acwr: number;
  hooper: number;
  /** Check-in scales, 1..7, 7 = best. */
  sleep: number;
  stress: number;
  fatigue: number;
  soreness: number;
  penalties: { code: 'EXAM_SOON' | 'WELLNESS_WORSE' | 'ACWR_RISING'; points: number }[];
  /** Last 7 days, oldest first. */
  week: { score: number; zone: 'green' | 'yellow' | 'red' }[];
};

export const DEMO_READINESS: DemoReadiness = {
  score: 64,
  zone: 'yellow',
  acwr: 1.32,
  hooper: 14,
  sleep: 3,
  stress: 2,
  fatigue: 4,
  soreness: 3,
  penalties: [
    { code: 'EXAM_SOON', points: 15 },
    { code: 'WELLNESS_WORSE', points: 12 },
    { code: 'ACWR_RISING', points: 9 },
  ],
  week: [
    { score: 82, zone: 'green' },
    { score: 78, zone: 'green' },
    { score: 71, zone: 'green' },
    { score: 58, zone: 'yellow' },
    { score: 69, zone: 'yellow' },
    { score: 75, zone: 'green' },
    { score: 64, zone: 'yellow' },
  ],
};

export const DEMO_STREAK = { days: 12, weekGoal: 7, monthGoal: 30 };

export const DEMO_PASS = {
  level: 'block' as const,
  codes: ['PRE_MATCH', 'EXAM_WINDOW'] as const,
  id: 'A7F319C2',
};

export const DEMO_SORENESS: SorenessMap = [{ zoneId: 'quadriceps', side: 'both', severity: 4 }];

/** ACWR band words, same thresholds as the product (0.8 / 1.3 / 1.5). */
export function acwrState(acwr: number): 'low' | 'ok' | 'rising' | 'spike' {
  if (acwr > 1.5) return 'spike';
  if (acwr > 1.3) return 'rising';
  if (acwr < 0.8) return 'low';
  return 'ok';
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function demoEngine(): EngineLimits {
  return {
    date: todayIso(),
    ceiling: DEMO_READINESS.zone,
    readinessScore: DEMO_READINESS.score,
    acwr: DEMO_READINESS.acwr,
    hooperIndex: DEMO_READINESS.hooper,
    reasonCodes: ['ACWR_RISING'],
    examStorm: false,
    rtp: { state: 'none', clearedOn: null },
  };
}

/** The real coach module, rules only (no AI call from the studio). */
export function buildDemoPlan(lang: AdpLang, soreness: SorenessMap): PlanView {
  const req = buildCoachingPrompt({ lang, soreness }, demoEngine(), { sportType: 'football', seasonPhase: 'off_season' });
  return buildPlanView(req.context, fallbackPlan(req.context), 'rules');
}
