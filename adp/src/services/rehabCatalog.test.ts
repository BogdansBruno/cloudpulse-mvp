import { describe, it, expect } from 'vitest';
import {
  BODY_ZONES,
  BLOCK_KINDS,
  CAUTIOUS_ZONES,
  CEILING_RULES,
  SPORT_FOCUS_ZONES,
  SPORT_TYPES,
} from '../types/sportProfile';
import {
  DRILLS,
  DRILL_USES,
  EQUIPMENT,
  REFERRAL_LINE,
  STOP_RULE,
  fitsCeiling,
  generalDrills,
  getDrill,
  prehabDrillsFor,
  reliefDrillsFor,
  zonesWithoutRelief,
} from './rehabCatalog';

const LANGS = ['ru', 'lv', 'en'] as const;

describe('catalogue integrity', () => {
  it('ids are unique snake_case', () => {
    const ids = DRILLS.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(/^[a-z][a-z0-9_]*$/.test(id)).toBe(true);
  });

  it('every field uses known values', () => {
    for (const x of DRILLS) {
      expect((BLOCK_KINDS as readonly string[]).includes(x.kind)).toBe(true);
      expect((DRILL_USES as readonly string[]).includes(x.use)).toBe(true);
      for (const z of x.zones) expect((BODY_ZONES as readonly string[]).includes(z)).toBe(true);
      for (const s of x.sports) expect((SPORT_TYPES as readonly string[]).includes(s)).toBe(true);
      for (const e of x.equipment) expect((EQUIPMENT as readonly string[]).includes(e)).toBe(true);
      expect(x.minutes > 0 && x.minutes <= 20).toBe(true);
      expect(Number.isInteger(x.rpe) && x.rpe >= 1 && x.rpe <= 8).toBe(true);
    }
  });

  it('every drill is written in RU, LV and EN', () => {
    for (const x of DRILLS) {
      for (const l of LANGS) {
        expect(x.text[l].name.trim().length > 2 && x.text[l].cue.trim().length > 10).toBe(true);
      }
    }
    for (const l of LANGS) expect(STOP_RULE[l].length > 20 && REFERRAL_LINE[l].length > 20).toBe(true);
  });

  it('no treatment or diagnosis language anywhere (EU MDR)', () => {
    const banned = /лечени|лечит|терапи|диагноз|травм[ауы]|тендинит|растяжени[ея] связ|ārstē|terapij|diagnoz|trauma|treat|therap|diagnos|injur|tendin|rehab/i;
    for (const x of DRILLS) {
      for (const l of LANGS) {
        const text = `${x.text[l].name} ${x.text[l].cue}`;
        if (banned.test(text)) throw new Error(`${x.id} (${l}): ${text}`);
      }
    }
  });
});

describe('safety rules of the catalogue', () => {
  it('relief work is gentle: mobility or breathing only, RPE ≤ 2 — fits even the red ceiling', () => {
    for (const x of DRILLS.filter((d) => d.use === 'relief')) {
      expect(fitsCeiling(x, CEILING_RULES.red)).toBe(true);
    }
  });

  it('every zone on the silhouette has relief work', () => {
    expect(zonesWithoutRelief()).toEqual([]);
  });

  it('cautious zones (lower back, neck, shins) get only the gentlest relief (RPE 1)', () => {
    for (const z of CAUTIOUS_ZONES) {
      for (const x of reliefDrillsFor(z)) expect(x.rpe).toBe(1);
    }
  });

  it('eccentric work is prehab only — never offered as relief or general', () => {
    for (const x of DRILLS.filter((d) => d.kind === 'eccentric')) expect(x.use).toBe('prehab');
  });

  it('nothing fits under "blocked"', () => {
    expect(DRILLS.filter((x) => fitsCeiling(x, CEILING_RULES.blocked))).toEqual([]);
  });

  it('every focus zone of every sport has prehab work', () => {
    for (const s of SPORT_TYPES) {
      for (const z of SPORT_FOCUS_ZONES[s]) {
        const has = prehabDrillsFor(s).some((x) => x.zones.includes(z));
        if (!has) throw new Error(`no prehab for ${s} / ${z}`);
      }
    }
  });
});

describe('lookups', () => {
  it('getDrill knows ids and nothing else', () => {
    expect(getDrill('calf_foam_roll')?.kind).toBe('mobility');
    expect(getDrill('made_up_exercise')).toBeNull();
  });

  it('tired calves + basketball: rolling and stretching, not eccentric lowering', () => {
    const relief = reliefDrillsFor('calves', 'basketball').map((x) => x.id);
    expect(relief).toContain('calf_foam_roll');
    expect(relief).toContain('calf_wall_stretch');
    expect(relief).not.toContain('calf_eccentric_lowering');
    const prehab = prehabDrillsFor('basketball', ['calves']).map((x) => x.id);
    expect(prehab.some((id) => id.startsWith('calf_'))).toBe(false);
  });

  it('calves feel fine → eccentric lowering is back in basketball prehab', () => {
    expect(prehabDrillsFor('basketball').map((x) => x.id)).toContain('calf_eccentric_lowering');
  });

  it('football prehab covers hamstrings and groin; swimming covers the shoulder', () => {
    const football = prehabDrillsFor('football').map((x) => x.id);
    expect(football).toContain('nordic_hamstring_assisted');
    expect(football).toContain('adductor_ball_squeeze');
    const swimming = prehabDrillsFor('swimming').map((x) => x.id);
    expect(swimming).toContain('band_external_rotation');
    expect(swimming).not.toContain('nordic_hamstring_assisted');
  });

  it('under yellow, heavy eccentric work is filtered out', () => {
    expect(fitsCeiling(getDrill('nordic_hamstring_assisted')!, CEILING_RULES.yellow)).toBe(false);
    expect(fitsCeiling(getDrill('adductor_ball_squeeze')!, CEILING_RULES.yellow)).toBe(true);
    expect(fitsCeiling(getDrill('nordic_hamstring_assisted')!, CEILING_RULES.green)).toBe(true);
  });

  it('general work avoids sore zones and prefers the athlete\'s sport', () => {
    const strength = generalDrills('bodyweight_strength', 'football', ['quadriceps']).map((x) => x.id);
    expect(strength).not.toContain('bodyweight_squat');
    expect(strength).toContain('single_leg_rdl');
    expect(generalDrills('aerobic_base', 'swimming')[0].id).toBe('easy_swim');
    expect(generalDrills('aerobic_base', 'football').map((x) => x.id)).not.toContain('easy_swim');
  });
});
