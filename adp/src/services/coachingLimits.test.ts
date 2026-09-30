import { describe, it, expect } from 'vitest';
import type { EngineLimits, SorenessZone } from '../types/sportProfile';
import { MICRO_DOSE } from '../types/sportProfile';
import { allowedIds, candidateDrills, drillFits, resolveLimits } from './coachingLimits';
import { getDrill } from './rehabCatalog';

const engine = (over: Partial<EngineLimits> = {}): EngineLimits => ({
  date: '2026-10-10',
  ceiling: 'green',
  readinessScore: 86,
  acwr: 1.1,
  hooperIndex: 10,
  reasonCodes: [],
  examStorm: false,
  rtp: { state: 'none', clearedOn: null },
  ...over,
});
const sore = (zoneId: SorenessZone['zoneId'], severity: SorenessZone['severity'], side: SorenessZone['side'] = 'both'): SorenessZone => ({
  zoneId,
  side,
  severity,
});

describe('resolveLimits — the engine ceiling is only ever tightened', () => {
  it('green, no phase: full session within the green ceiling', () => {
    const l = resolveLimits(engine(), { seasonPhase: null }, []);
    expect(l).toEqual(expect.objectContaining({ mode: 'full', ceiling: 'green', maxMinutes: 60, maxRpe: 8, reasons: [] }));
  });

  it('yellow: reduced, and the reason is recorded', () => {
    const l = resolveLimits(engine({ ceiling: 'yellow' }), { seasonPhase: null }, []);
    expect(l.maxMinutes).toBe(35);
    expect(l.maxRpe).toBe(5);
    expect(l.allowedKinds).not.toContain('eccentric');
    expect(l.reasons).toEqual(['ENGINE_CEILING']);
  });

  it('red → recovery only; blocked → no plan at all', () => {
    expect(resolveLimits(engine({ ceiling: 'red' }), { seasonPhase: null }, []).mode).toBe('recovery_only');
    const b = resolveLimits(engine({ ceiling: 'blocked' }), { seasonPhase: 'pre_season' }, [sore('calves', 2)]);
    expect(b).toEqual(expect.objectContaining({ mode: 'none', maxMinutes: 0, maxRpe: 0, allowedKinds: [] }));
  });

  it('Return-to-Play not cleared yet → recovery only, even on a green day', () => {
    const l = resolveLimits(engine({ rtp: { state: 'ready', clearedOn: null } }), { seasonPhase: null }, []);
    expect(l.mode).toBe('recovery_only');
    expect(l.reasons).toContain('RTP_NOT_CLEARED');
  });

  it('after clearance: graded return in 3 stages, then normal', () => {
    const at = (day: string) => resolveLimits(engine({ date: day, rtp: { state: 'cleared', clearedOn: '2026-10-01' } }), { seasonPhase: null }, []);
    const s1 = at('2026-10-02');
    expect([s1.mode, s1.rtpStage, s1.ceiling, s1.maxRpe, s1.allowedKinds.includes('eccentric')]).toEqual(['rtp_progression', 1, 'yellow', 4, false]);
    const s2 = at('2026-10-05');
    expect([s2.rtpStage, s2.maxRpe]).toEqual([2, 5]);
    const s3 = at('2026-10-09');
    expect([s3.rtpStage, s3.ceiling, s3.maxRpe]).toEqual([3, 'green', 7]);
    expect(at('2026-10-15').mode).toBe('full');
  });

  it('match today/tomorrow: activation and mobility only; day after: easy recovery', () => {
    const near = resolveLimits(engine({ reasonCodes: ['PRE_MATCH'] }), { seasonPhase: 'in_season' }, []);
    expect(near.allowedKinds).toEqual(['mobility', 'activation', 'breathing_recovery']);
    expect(near.maxRpe).toBe(4);
    const after = resolveLimits(engine({ reasonCodes: ['POST_MATCH'] }), { seasonPhase: 'in_season' }, []);
    expect(after.allowedKinds).toEqual(['mobility', 'aerobic_base', 'breathing_recovery']);
  });

  it('season phase caps the extra session (in-season shorter than pre-season)', () => {
    expect(resolveLimits(engine(), { seasonPhase: 'in_season' }, []).maxMinutes).toBe(30);
    expect(resolveLimits(engine(), { seasonPhase: 'pre_season' }, []).maxMinutes).toBe(60);
    const rec = resolveLimits(engine(), { seasonPhase: 'recovery' }, []);
    expect([rec.maxMinutes, rec.maxRpe, rec.allowedKinds.includes('eccentric')]).toEqual([20, 4, false]);
  });

  it('exam storm → 12-minute micro-dose, no long aerobic, no eccentric', () => {
    const l = resolveLimits(engine({ examStorm: true }), { seasonPhase: 'off_season' }, []);
    expect(l.mode).toBe('micro_dose');
    expect(l.maxMinutes).toBe(MICRO_DOSE.minutes);
    expect(l.allowedKinds).not.toContain('aerobic_base');
    expect(l.allowedKinds).not.toContain('eccentric');
  });

  it('exam storm on a red day stays recovery only (micro-dose never loosens)', () => {
    expect(resolveLimits(engine({ ceiling: 'red', examStorm: true }), { seasonPhase: null }, []).mode).toBe('recovery_only');
  });

  it('soreness: 4/5 quad → relief; 5/5 or cautious 3/5 → referred', () => {
    const l = resolveLimits(engine(), { seasonPhase: null }, [sore('quadriceps', 4), sore('calves', 5), sore('lower_back', 3, 'center')]);
    expect(l.reliefZones).toEqual(['quadriceps']);
    expect(l.referredZones).toEqual(['calves', 'lower_back']);
    expect(l.reasons).toEqual(['SORE_ZONE_RELIEF_ONLY', 'SORE_ZONE_REFERRED']);
  });

  it('one side referable, the other not → the whole zone is referred', () => {
    const l = resolveLimits(engine(), { seasonPhase: null }, [sore('calves', 2, 'left'), sore('calves', 5, 'right')]);
    expect(l.reliefZones).toEqual([]);
    expect(l.referredZones).toEqual(['calves']);
  });
});

describe('candidateDrills — the only ids the AI may use', () => {
  it('everything offered fits the limits', () => {
    const l = resolveLimits(engine({ ceiling: 'yellow' }), { seasonPhase: 'off_season' }, [sore('quadriceps', 4)]);
    const c = candidateDrills(l, 'football');
    for (const id of allowedIds(c)) expect(drillFits(getDrill(id)!, l)).toBe(true);
  });

  it('a sore quad gets quad relief; nothing else may load it', () => {
    const l = resolveLimits(engine(), { seasonPhase: 'off_season' }, [sore('quadriceps', 4)]);
    const c = candidateDrills(l, 'football');
    expect(c.relief.quadriceps).toContain('quad_foam_roll');
    for (const id of [...c.prehab, ...Object.values(c.general).flat()]) {
      const d = getDrill(id!)!;
      if (d.use !== 'relief') expect(d.zones.includes('quadriceps')).toBe(false);
    }
    expect(Object.values(c.general).flat()).not.toContain('bodyweight_squat');
  });

  it('referred zones get no drills at all', () => {
    const l = resolveLimits(engine(), { seasonPhase: null }, [sore('lower_back', 4, 'center')]);
    const c = candidateDrills(l, 'athletics');
    expect(c.relief.lower_back).toBeUndefined();
    for (const id of allowedIds(c)) expect(getDrill(id)!.zones.includes('lower_back')).toBe(false);
  });

  it('recovery-only days: no prehab, only mobility and breathing', () => {
    const l = resolveLimits(engine({ ceiling: 'red' }), { seasonPhase: null }, []);
    const c = candidateDrills(l, 'football');
    expect(c.prehab).toEqual([]);
    expect(Object.keys(c.general).sort()).toEqual(['breathing_recovery', 'mobility']);
  });

  it('blocked: nothing', () => {
    const l = resolveLimits(engine({ ceiling: 'blocked' }), { seasonPhase: null }, []);
    expect(allowedIds(candidateDrills(l, 'football')).size).toBe(0);
  });
});
