import { describe, it, expect } from 'vitest';
import type { EngineLimits } from '../types/sportProfile';
import { buildCoachingPrompt } from './AIPromptBuilder';
import { PLAN_RULE_CODES, fallbackPlan, validatePlan } from './planGuard';
import { buildPlanView } from './planView';
import { STOP_RULE, getDrill } from './rehabCatalog';

const engine = (over: Partial<EngineLimits> = {}): EngineLimits => ({
  date: '2026-10-12',
  ceiling: 'yellow',
  readinessScore: 58,
  acwr: 1.34,
  hooperIndex: 15,
  reasonCodes: [],
  examStorm: false,
  rtp: { state: 'none', clearedOn: null },
  ...over,
});

const quad = { zoneId: 'quadriceps', side: 'both', severity: 4 } as const;

describe('buildPlanView — what the athlete screen shows', () => {
  it('21 rules, and the plan it shows still passes them', () => {
    expect(PLAN_RULE_CODES.length).toBe(21);
    const r = buildCoachingPrompt({ lang: 'ru', soreness: [quad] }, engine(), { sportType: 'football', seasonPhase: null });
    const plan = fallbackPlan(r.context);
    expect(validatePlan(plan, r.context).ok).toBe(true);
    const v = buildPlanView(r.context, plan, 'rules');
    expect(v.rulesChecked).toBe(21);
    expect(v.source).toBe('rules');
  });

  it('sore quad → first block is gentle work labelled for it; football prehab is labelled prehab', () => {
    const r = buildCoachingPrompt({ lang: 'ru', soreness: [quad] }, engine(), { sportType: 'football', seasonPhase: null });
    const v = buildPlanView(r.context, fallbackPlan(r.context), 'rules');
    expect(v.blocks[0].role).toBe('relief');
    expect(v.blocks[0].targetZone).toBe('quadriceps');
    expect(v.blocks[0].drills[0].name.length > 0).toBe(true);
    expect(v.blocks.some((b) => b.role === 'prehab')).toBe(true);
    expect(v.totalMinutes <= v.limits.maxMinutes).toBe(true);
    expect(v.limits.reasons).toContain('SORE_ZONE_RELIEF_ONLY');
  });

  it('drill names and cues come in the athlete language', () => {
    for (const lang of ['ru', 'lv', 'en'] as const) {
      const r = buildCoachingPrompt({ lang, soreness: [quad] }, engine(), { sportType: 'football', seasonPhase: null });
      const v = buildPlanView(r.context, fallbackPlan(r.context), 'rules');
      for (const b of v.blocks)
        for (const d of b.drills) {
          expect(d.name).toBe(getDrill(d.id)!.text[lang].name);
          expect(d.cue).toBe(getDrill(d.id)!.text[lang].cue);
        }
      expect(v.lang).toBe(lang);
      expect(v.stopRule).toBe(STOP_RULE[lang]);
    }
  });

  it('pain day (blocked) → no blocks, mode none', () => {
    const r = buildCoachingPrompt({ lang: 'en', soreness: [] }, engine({ ceiling: 'blocked' }), { sportType: null, seasonPhase: null });
    const v = buildPlanView(r.context, fallbackPlan(r.context), 'rules');
    expect(v.mode).toBe('none');
    expect(v.blocks).toEqual([]);
    expect(v.totalMinutes).toBe(0);
  });

  it('referred zones are passed through for the referral card', () => {
    const r = buildCoachingPrompt(
      { lang: 'ru', soreness: [{ zoneId: 'lower_back', side: 'center', severity: 3 }] },
      engine({ ceiling: 'green' }),
      { sportType: 'athletics', seasonPhase: null }
    );
    const v = buildPlanView(r.context, fallbackPlan(r.context), 'rules');
    expect(v.soreness.referredZones).toEqual(['lower_back']);
    for (const b of v.blocks) expect(b.targetZone === 'lower_back').toBe(false);
  });
});
