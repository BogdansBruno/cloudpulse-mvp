import { describe, it, expect } from 'vitest';
import {
  BODY_ZONES,
  CAUTIOUS_ZONES,
  CEILING_RULES,
  LOAD_CEILINGS,
  MICRO_DOSE,
  PAIRED_ZONES,
  SPORT_FOCUS_ZONES,
  SPORT_TYPES,
  ZONE_VIEW,
  fromSorenessRows,
  parseSorenessZones,
  selfCareAllowed,
  sideAllowed,
  stricterCeiling,
  toSorenessRows,
} from './sportProfile';

describe('body zones', () => {
  it('every zone has a silhouette view; no joints are selectable', () => {
    for (const z of BODY_ZONES) expect(ZONE_VIEW[z] === 'front' || ZONE_VIEW[z] === 'back').toBe(true);
    for (const joint of ['knee', 'ankle', 'wrist', 'elbow', 'hip']) {
      expect((BODY_ZONES as readonly string[]).includes(joint)).toBe(false);
    }
  });

  it('sport focus uses only known zones, every sport has an entry', () => {
    for (const s of SPORT_TYPES) {
      for (const z of SPORT_FOCUS_ZONES[s]) expect((BODY_ZONES as readonly string[]).includes(z)).toBe(true);
    }
    expect(SPORT_FOCUS_ZONES.football).toContain('hamstrings');
    expect(SPORT_FOCUS_ZONES.football).toContain('adductors');
    expect(SPORT_FOCUS_ZONES.swimming).toContain('shoulder_back');
  });

  it('paired zones take a side, central zones only "center"', () => {
    expect(PAIRED_ZONES.has('calves') && sideAllowed('calves', 'left')).toBe(true);
    expect(sideAllowed('calves', 'center')).toBe(false);
    expect(sideAllowed('lower_back', 'center')).toBe(true);
    expect(sideAllowed('lower_back', 'left')).toBe(false);
  });
});

describe('parseSorenessZones', () => {
  it('accepts what the silhouette sends', () => {
    expect(parseSorenessZones([{ zoneId: 'quadriceps', side: 'both', severity: 4 }])).toEqual({
      ok: true,
      value: [{ zoneId: 'quadriceps', side: 'both', severity: 4 }],
    });
    expect(parseSorenessZones([])).toEqual({ ok: true, value: [] });
  });

  it('reports every problem at once and fixes nothing', () => {
    const r = parseSorenessZones([
      { zoneId: 'knee', side: 'left', severity: 3 },
      { zoneId: 'calves', side: 'center', severity: 2 },
      { zoneId: 'glutes', side: 'right', severity: 6 },
      { zoneId: 'glutes', side: 'right', severity: 2.5 },
      { zoneId: 'hamstrings', side: 'left', severity: 2 },
      { zoneId: 'hamstrings', side: 'left', severity: 3 },
    ]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.map((e) => e.code)).toEqual([
      'UNKNOWN_ZONE',
      'BAD_SIDE',
      'BAD_SEVERITY',
      'BAD_SEVERITY',
      'DUPLICATE_ZONE',
    ]);
  });

  it('more than 6 zones is general fatigue — rejected', () => {
    const many = ['calves', 'quadriceps', 'hamstrings', 'glutes', 'adductors', 'hip_flexors', 'shins'].map((z) => ({
      zoneId: z,
      side: 'both',
      severity: 2,
    }));
    const r = parseSorenessZones(many);
    expect(!r.ok && r.error[0]).toEqual({ code: 'TOO_MANY_ZONES', max: 6 });
    expect(parseSorenessZones('calves').ok).toBe(false);
  });
});

describe('selfCareAllowed', () => {
  it('drills up to 4/5; 5/5 gets only the referral line', () => {
    expect(selfCareAllowed({ zoneId: 'quadriceps', side: 'both', severity: 4 })).toBe(true);
    expect(selfCareAllowed({ zoneId: 'quadriceps', side: 'both', severity: 5 })).toBe(false);
  });

  it('cautious zones (lower back, neck, shins) are referred from 3/5', () => {
    expect(CAUTIOUS_ZONES.has('lower_back')).toBe(true);
    expect(selfCareAllowed({ zoneId: 'lower_back', side: 'center', severity: 2 })).toBe(true);
    expect(selfCareAllowed({ zoneId: 'lower_back', side: 'center', severity: 3 })).toBe(false);
    expect(selfCareAllowed({ zoneId: 'shins', side: 'left', severity: 3 })).toBe(false);
  });
});

describe('ceilings', () => {
  it('get strictly tighter from green to blocked', () => {
    for (let i = 1; i < LOAD_CEILINGS.length; i++) {
      const looser = CEILING_RULES[LOAD_CEILINGS[i - 1]];
      const tighter = CEILING_RULES[LOAD_CEILINGS[i]];
      expect(tighter.maxMinutes < looser.maxMinutes).toBe(true);
      expect(tighter.maxRpe < looser.maxRpe).toBe(true);
      for (const k of tighter.allowedKinds) expect(looser.allowedKinds).toContain(k);
    }
    expect(CEILING_RULES.blocked.allowedKinds).toEqual([]);
    expect(CEILING_RULES.red.allowedKinds).toEqual(['mobility', 'breathing_recovery']);
  });

  it('micro-dose fits under the yellow ceiling', () => {
    expect(MICRO_DOSE.minutes <= CEILING_RULES.yellow.maxMinutes && MICRO_DOSE.maxRpe <= CEILING_RULES.yellow.maxRpe).toBe(true);
  });

  it('combining ceilings can only tighten', () => {
    expect(stricterCeiling('green', 'yellow')).toBe('yellow');
    expect(stricterCeiling('blocked', 'green')).toBe('blocked');
    expect(stricterCeiling('red', 'red')).toBe('red');
  });
});

describe('database rows', () => {
  it('round-trips through the snake_case column shape', () => {
    const zones = [{ zoneId: 'calves' as const, side: 'left' as const, severity: 3 as const }];
    const rows = toSorenessRows(zones);
    expect(rows).toEqual([{ zone_id: 'calves', side: 'left', severity: 3 }]);
    expect(fromSorenessRows(rows)).toEqual({ ok: true, value: zones });
    expect(fromSorenessRows([{ zone_id: 'knee', side: 'left', severity: 3 }]).ok).toBe(false);
  });
});
