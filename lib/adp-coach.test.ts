import { describe, it, expect } from 'vitest';
import { adpSportFromProfile, engineLimitsFromCloudPulse } from './adp-coach';
import type { ReadinessResult, SafetyViolation } from './readiness-engine';
import type { RtpStatus } from './return-to-play';
import { buildCoachingPrompt } from '../adp/src/services/AIPromptBuilder';
import { fallbackPlan, validatePlan } from '../adp/src/services/planGuard';
import { buildPlanView } from '../adp/src/services/planView';

const readiness = (over: Partial<ReadinessResult> = {}): ReadinessResult => ({
  score: 64,
  zone: 'yellow',
  acwr: 1.32,
  acuteLoad: 1800,
  chronicLoad: 1400,
  monotony: 1.4,
  hooperScore: 14,
  hooperBaseline: 12,
  trainingStreak: 3,
  penalties: [],
  inconsistencyFlags: [],
  isPainBlocked: false,
  ...over,
});
const none: RtpStatus = { state: 'none' };
const date = '2026-10-12';

describe('adpSportFromProfile — onboarding labels → ADP sports', () => {
  it('maps the onboarding options', () => {
    expect(adpSportFromProfile('Football')).toBe('football');
    expect(adpSportFromProfile('Basketball')).toBe('basketball');
    expect(adpSportFromProfile('Athletics')).toBe('athletics');
    expect(adpSportFromProfile('Swimming')).toBe('swimming');
    expect(adpSportFromProfile('Gym / General fitness')).toBe('other');
    expect(adpSportFromProfile('Other')).toBe('other');
    expect(adpSportFromProfile(null)).toBeNull();
    expect(adpSportFromProfile('  ')).toBeNull();
  });
});

describe('engineLimitsFromCloudPulse — the engine verdict, never softened', () => {
  it('engine zone becomes the ceiling; numbers pass through', () => {
    const e = engineLimitsFromCloudPulse({ date, readiness: readiness(), safetyViolations: [], rtp: none });
    expect([e.ceiling, e.readinessScore, e.acwr, e.hooperIndex, e.examStorm]).toEqual(['yellow', 64, 1.32, 14, false]);
  });

  it('pain today → blocked, whatever the zone', () => {
    const pain: SafetyViolation[] = [{ code: 'PAIN_REPORTED' } as SafetyViolation];
    expect(engineLimitsFromCloudPulse({ date, readiness: readiness({ zone: 'green' }), safetyViolations: pain, rtp: none }).ceiling).toBe('blocked');
    expect(engineLimitsFromCloudPulse({ date, readiness: readiness({ isPainBlocked: true }), safetyViolations: [], rtp: none }).ceiling).toBe('blocked');
  });

  it('match codes pass through; exam within 3 days → micro-dose flag', () => {
    const e = engineLimitsFromCloudPulse({
      date,
      readiness: readiness({ zone: 'green', penalties: [{ code: 'EXAM_SOON', reason: '', points: 15 }] }),
      safetyViolations: [{ code: 'PRE_MATCH' } as SafetyViolation],
      rtp: none,
    });
    expect(e.reasonCodes).toContain('PRE_MATCH');
    expect(e.examStorm).toBe(true);
  });

  it('Return-to-Play states map one to one; clearance date is the day', () => {
    const base = { painDate: '2026-10-05', painZone: null, cleanDays: 2, followups: [], dueFollowup: null };
    const r1 = engineLimitsFromCloudPulse({ date, readiness: readiness(), safetyViolations: [], rtp: { ...base, state: 'ready', clearedAt: null } });
    expect(r1.rtp).toEqual({ state: 'ready', clearedOn: null });
    const r2 = engineLimitsFromCloudPulse({
      date,
      readiness: readiness(),
      safetyViolations: [],
      rtp: { ...base, state: 'cleared', clearedAt: '2026-10-09T15:20:00Z' },
    });
    expect(r2.rtp).toEqual({ state: 'cleared', clearedOn: '2026-10-09' });
  });
});

describe('check-in → plan on the screen (no AI)', () => {
  const plan = (r: ReadinessResult, v: SafetyViolation[], rtp: RtpStatus = none) => {
    const engine = engineLimitsFromCloudPulse({ date, readiness: r, safetyViolations: v, rtp });
    const req = buildCoachingPrompt(
      { lang: 'ru', soreness: [{ zoneId: 'quadriceps', side: 'both', severity: 4 }] },
      engine,
      { sportType: adpSportFromProfile('Football'), seasonPhase: null }
    );
    const p = fallbackPlan(req.context);
    expect(validatePlan(p, req.context).ok).toBe(true);
    return buildPlanView(req.context, p, 'rules');
  };

  it('yellow footballer with a tight quad: gentle quad work first, within the yellow limit', () => {
    const v = plan(readiness(), []);
    expect(v.mode).toBe('full');
    expect(v.blocks[0]).toEqual(expect.objectContaining({ role: 'relief', targetZone: 'quadriceps' }));
    expect(v.totalMinutes <= 35).toBe(true);
    for (const b of v.blocks) expect(b.rpeCap <= 5).toBe(true);
  });

  it('pain today: no workout at all', () => {
    expect(plan(readiness(), [{ code: 'PAIN_REPORTED' } as SafetyViolation]).mode).toBe('none');
  });

  it('red day: recovery only', () => {
    const v = plan(readiness({ zone: 'red', score: 38 }), []);
    expect(v.mode).toBe('recovery_only');
    for (const b of v.blocks) expect(b.kind === 'mobility' || b.kind === 'breathing_recovery').toBe(true);
  });

  it('match tomorrow: activation and mobility only', () => {
    const v = plan(readiness({ zone: 'green', score: 90 }), [{ code: 'PRE_MATCH' } as SafetyViolation]);
    for (const b of v.blocks) expect(['mobility', 'activation', 'breathing_recovery'].includes(b.kind)).toBe(true);
    expect(v.limits.reasons).toContain('MATCH_NEAR');
  });
});
