import { describe, it, expect } from 'vitest';
import { SEASON_PHASES, SPORT_TYPES, type EngineLimits, type LoadCeiling, type SorenessZone } from '../types/sportProfile';
import { buildCoachingPrompt, type ClaudeRequest } from './AIPromptBuilder';
import { coachPlan, fallbackPlan, parseModelReply, validatePlan } from './planGuard';

const engine = (over: Partial<EngineLimits> = {}): EngineLimits => ({
  date: '2026-10-10',
  ceiling: 'yellow',
  readinessScore: 62,
  acwr: 1.32,
  hooperIndex: 14,
  reasonCodes: [],
  examStorm: false,
  rtp: { state: 'none', clearedOn: null },
  ...over,
});
const quad4: SorenessZone = { zoneId: 'quadriceps', side: 'both', severity: 4 };
const req = (over: Partial<EngineLimits> = {}, soreness: SorenessZone[] = [quad4]): ClaudeRequest =>
  buildCoachingPrompt({ lang: 'ru', soreness }, engine(over), { sportType: 'football', seasonPhase: 'off_season' });

/** A good answer, as a well-behaved model would give it. */
const good = () => ({
  mode: 'full',
  blocks: [
    { kind: 'mobility', drillIds: ['quad_foam_roll'], minutes: 2, rpeCap: 2, targetZone: 'quadriceps' },
    { kind: 'isometric', drillIds: ['adductor_ball_squeeze'], minutes: 2, rpeCap: 4, targetZone: null },
    { kind: 'aerobic_base', drillIds: ['easy_run'], minutes: 20, rpeCap: 4, targetZone: null },
  ],
  referredZones: [],
  explanation: 'Готовность 62, поэтому сегодня полегче: 2 минуты роллер для бедра, сжатие мяча и 20 минут лёгкого бега.',
});

describe('validatePlan', () => {
  it('accepts a plan that stays inside the context', () => {
    const r = validatePlan(good(), req().context);
    expect(r.ok).toBe(true);
  });

  it('rejects an invented exercise', () => {
    const p = good();
    p.blocks[1].drillIds = ['heavy_back_squat'];
    const r = validatePlan(p, req().context);
    expect(!r.ok && r.violations.map((v) => v.code)).toContain('UNKNOWN_DRILL');
  });

  it('rejects a real drill that does not fit today (Nordics on a yellow day)', () => {
    const p = good();
    p.blocks[1] = { kind: 'eccentric', drillIds: ['nordic_hamstring_assisted'], minutes: 4, rpeCap: 7, targetZone: null };
    const codes = (() => {
      const r = validatePlan(p, req().context);
      return r.ok ? [] : r.violations.map((v) => v.code);
    })();
    expect(codes).toContain('KIND_NOT_ALLOWED');
    expect(codes).toContain('DRILL_NOT_ALLOWED');
    expect(codes).toContain('RPE_OVER_LIMIT');
  });

  it('rejects loading the sore quad with squats', () => {
    const p = good();
    p.blocks[1] = { kind: 'bodyweight_strength', drillIds: ['bodyweight_squat'], minutes: 3, rpeCap: 5, targetZone: null };
    const r = validatePlan(p, req().context);
    expect(!r.ok && r.violations.map((v) => v.code)).toContain('RELIEF_BLOCK_WRONG');
  });

  it('rejects going over the minutes and a missing relief block', () => {
    const p = good();
    p.blocks = [
      { kind: 'aerobic_base', drillIds: ['easy_run'], minutes: 34, rpeCap: 4, targetZone: null },
      { kind: 'isometric', drillIds: ['adductor_ball_squeeze'], minutes: 2, rpeCap: 4, targetZone: null },
    ];
    p.explanation = 'Сегодня лёгкий бег.';
    const r = validatePlan(p, req().context);
    const codes = r.ok ? [] : r.violations.map((v) => v.code);
    expect(codes).toContain('MINUTES_OVER_LIMIT');
    expect(codes).toContain('RELIEF_ZONE_MISSING');
  });

  it('rejects medical language, percentages and invented numbers', () => {
    const p = good();
    p.explanation = 'Это снизит риск травмы на 40% — лечение воспаления займёт 3 недели.';
    const r = validatePlan(p, req().context);
    const codes = r.ok ? [] : r.violations.map((v) => v.code);
    expect(codes).toContain('MEDICAL_LANGUAGE');
    expect(codes).toContain('PERCENTAGE');
    expect(codes).toContain('INVENTED_NUMBER');
  });

  it('referred zones: no drills, and they must be listed', () => {
    const ctx = req({}, [{ zoneId: 'lower_back', side: 'center', severity: 4 }]).context;
    const p = {
      mode: 'full',
      blocks: [{ kind: 'mobility', drillIds: ['cat_camel'], minutes: 2, rpeCap: 1, targetZone: 'lower_back' }],
      referredZones: [],
      explanation: 'Мягко для спины.',
    };
    const r = validatePlan(p, ctx);
    const codes = r.ok ? [] : r.violations.map((v) => v.code);
    expect(codes).toContain('REFERRED_ZONE_TARGETED');
    expect(codes).toContain('REFERRAL_MISSING');
  });

  it('wrong mode, bad shape and non-JSON are rejected', () => {
    const p = { ...good(), mode: 'micro_dose' };
    const r = validatePlan(p, req().context);
    expect(!r.ok && r.violations[0].code).toBe('MODE_MISMATCH');
    expect(validatePlan({ mode: 'full' }, req().context).ok).toBe(false);
    expect(validatePlan([], req().context).ok).toBe(false);
    expect(parseModelReply('Sure! Here is your plan: {...}')).toBeNull();
    expect(parseModelReply('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe('fallbackPlan — always valid, whatever the day', () => {
  const ceilings: LoadCeiling[] = ['green', 'yellow', 'red', 'blocked'];
  const sorenessSets: SorenessZone[][] = [
    [],
    [quad4],
    [
      { zoneId: 'calves', side: 'left', severity: 3 },
      { zoneId: 'lower_back', side: 'center', severity: 3 },
      { zoneId: 'shoulder_back', side: 'right', severity: 5 },
    ],
  ];

  it('passes the validator for every sport × phase × ceiling × storm × RTP × soreness combination', () => {
    let checked = 0;
    for (const sport of SPORT_TYPES)
      for (const phase of [...SEASON_PHASES, null])
        for (const ceiling of ceilings)
          for (const examStorm of [false, true])
            for (const rtp of [
              { state: 'none' as const, clearedOn: null },
              { state: 'restricted' as const, clearedOn: null },
              { state: 'cleared' as const, clearedOn: '2026-10-08' },
            ])
              for (const soreness of sorenessSets) {
                const r = buildCoachingPrompt({ lang: 'en', soreness }, engine({ ceiling, examStorm, rtp }), { sportType: sport, seasonPhase: phase });
                const plan = fallbackPlan(r.context);
                const v = validatePlan(plan, r.context);
                if (!v.ok) throw new Error(`${sport}/${phase}/${ceiling}/${examStorm}/${rtp.state}: ${JSON.stringify(v.violations)}`);
                checked++;
              }
    expect(checked).toBe(6 * 5 * 4 * 2 * 3 * 3);
  });

  it('a blocked day has no blocks; sore zones always get relief first', () => {
    expect(fallbackPlan(req({ ceiling: 'blocked' }).context).blocks).toEqual([]);
    const p = fallbackPlan(req().context);
    expect(p.blocks[0]).toEqual(expect.objectContaining({ targetZone: 'quadriceps', kind: 'mobility' }));
  });
});

describe('coachPlan — the model is asked, the guard decides', () => {
  it('uses a valid AI answer', async () => {
    const r = await coachPlan(req(), async () => JSON.stringify(good()));
    expect(r.source).toBe('ai');
  });

  it('falls back when the answer breaks a rule, and says why', async () => {
    const bad = { ...good(), explanation: 'Это лечение для колена.' };
    const r = await coachPlan(req(), async () => JSON.stringify(bad));
    expect(r.source).toBe('fallback');
    expect(r.violations.map((v) => v.code)).toContain('MEDICAL_LANGUAGE');
    expect(validatePlan(r.plan, req().context).ok).toBe(true);
  });

  it('falls back on network error or prose', async () => {
    expect((await coachPlan(req(), async () => { throw new Error('timeout'); })).source).toBe('fallback');
    expect((await coachPlan(req(), async () => 'Sorry, I cannot help')).source).toBe('fallback');
  });

  it('does not call the model on a blocked day', async () => {
    let called = false;
    const r = await coachPlan(req({ ceiling: 'blocked' }), async () => {
      called = true;
      return '{}';
    });
    expect(called).toBe(false);
    expect(r.aiSkipped && r.plan.blocks.length === 0).toBe(true);
  });
});
