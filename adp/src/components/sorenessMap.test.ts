import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BODY_ZONES, SORENESS_RULES, parseSorenessZones, toSorenessRows, fromSorenessRows } from '../types/sportProfile';
import SorenessSilhouette, { SILHOUETTE_SHAPES } from './SorenessSilhouette';
import { SORENESS_LABELS } from './labels';
import { athleteHalf, isReferred, setSeverity, severityAt, type SorenessMap } from './sorenessMap';

const set = (map: SorenessMap, ...args: Parameters<typeof setSeverity> extends [unknown, ...infer R] ? R : never) => {
  const r = setSeverity(map, ...args);
  if (!r.ok) throw new Error('unexpected refusal');
  return r.map;
};

describe('sorenessMap — what the silhouette hands back', () => {
  it('one tap on the left quad → one left entry', () => {
    expect(set([], 'quadriceps', ['left'], 4)).toEqual([{ zoneId: 'quadriceps', side: 'left', severity: 4 }]);
  });

  it('same level on both sides merges into "both"; different levels stay separate', () => {
    let m = set([], 'quadriceps', ['left'], 4);
    m = set(m, 'quadriceps', ['right'], 4);
    expect(m).toEqual([{ zoneId: 'quadriceps', side: 'both', severity: 4 }]);
    m = set(m, 'quadriceps', ['right'], 2);
    expect(m).toEqual([
      { zoneId: 'quadriceps', side: 'left', severity: 4 },
      { zoneId: 'quadriceps', side: 'right', severity: 2 },
    ]);
  });

  it('central zones only take "center"; a paired half on a central zone is ignored', () => {
    expect(set([], 'lower_back', ['center'], 2)).toEqual([{ zoneId: 'lower_back', side: 'center', severity: 2 }]);
    expect(set([], 'lower_back', ['left'], 2)).toEqual([]);
  });

  it('clearing one side of "both" leaves the other', () => {
    const m = set([{ zoneId: 'calves', side: 'both', severity: 3 }], 'calves', ['right'], null);
    expect(m).toEqual([{ zoneId: 'calves', side: 'left', severity: 3 }]);
    expect(severityAt(m, 'calves', 'right')).toBeNull();
  });

  it('order is fixed (BODY_ZONES), whatever the tap order', () => {
    let m = set([], 'calves', ['left', 'right'], 2);
    m = set(m, 'chest', ['center'], 1);
    expect(m.map((z) => z.zoneId)).toEqual(['chest', 'calves']);
  });

  it(`refuses a 7th entry, never drops one silently; clearing always works`, () => {
    const zones = ['chest', 'abdominals', 'upper_back', 'lower_back', 'neck_upper_traps', 'quadriceps'] as const;
    let m: SorenessMap = [];
    for (const z of zones) m = set(m, z, z === 'quadriceps' ? ['left', 'right'] : ['center'], 2);
    expect(m.length).toBe(SORENESS_RULES.maxZones);
    const r = setSeverity(m, 'calves', ['left'], 2);
    expect(r.ok).toBe(false);
    // Changing a level of an existing entry is fine…
    expect(setSeverity(m, 'chest', ['center'], 4).ok).toBe(true);
    // …but splitting "both" into two different sides would make a 7th entry.
    expect(setSeverity(m, 'quadriceps', ['left'], 4).ok).toBe(false);
    expect(setSeverity(m, 'chest', ['center'], null).ok).toBe(true);
  });

  it('everything it returns passes the check-in validator and the database round-trip', () => {
    let m = set([], 'hamstrings', ['left'], 3);
    m = set(m, 'hamstrings', ['right'], 5);
    m = set(m, 'neck_upper_traps', ['center'], 1);
    const parsed = parseSorenessZones(m);
    expect(parsed.ok).toBe(true);
    const back = fromSorenessRows(toSorenessRows(m));
    expect(back.ok && back.value).toEqual(m);
  });

  it('referral hint: 5/5 anywhere, 3/5+ on lower back / neck / shins', () => {
    expect(isReferred('quadriceps', 4)).toBe(false);
    expect(isReferred('quadriceps', 5)).toBe(true);
    expect(isReferred('lower_back', 2)).toBe(false);
    expect(isReferred('lower_back', 3)).toBe(true);
    expect(isReferred('shins', 3)).toBe(true);
  });

  it("left and right are the athlete's: front view is mirrored, back view is not", () => {
    expect(athleteHalf('quadriceps', 'front', false)).toBe('right');
    expect(athleteHalf('quadriceps', 'front', true)).toBe('left');
    expect(athleteHalf('hamstrings', 'back', false)).toBe('left');
    expect(athleteHalf('hamstrings', 'back', true)).toBe('right');
    expect(athleteHalf('chest', 'front', true)).toBe('center');
  });
});

describe('SorenessSilhouette — rendered', () => {
  const html = (map: SorenessMap, lang: 'ru' | 'lv' | 'en' = 'ru') =>
    renderToStaticMarkup(createElement(SorenessSilhouette, { value: map, onChange: () => {}, lang }));

  it('every one of the 18 muscle zones can be tapped; no joints', () => {
    const drawn = new Set([...SILHOUETTE_SHAPES.front, ...SILHOUETTE_SHAPES.back].map((s) => s.zone));
    for (const z of BODY_ZONES) expect(drawn.has(z)).toBe(true);
    const out = html([]);
    // 18 halves on the front (2 central + 8 paired × 2), 15 on the back (3 + 6 × 2).
    expect((out.match(/role="button" tabindex="0"/g) ?? []).length).toBe(33);
    expect(/knee|колен|ceļ|ankle|elbow/i.test(out)).toBe(false);
  });

  it('marked zones are also listed as text (not colour only), in each language', () => {
    const map: SorenessMap = [{ zoneId: 'quadriceps', side: 'both', severity: 4 }];
    expect(html(map, 'ru')).toContain('Квадрицепс · обе стороны · 4/5');
    expect(html(map, 'lv')).toContain('Kvadricepss · abas puses · 4/5');
    expect(html(map, 'en')).toContain('Quads · both sides · 4/5');
  });

  it('every label set is complete and says tightness, not diagnosis', () => {
    for (const lang of ['ru', 'lv', 'en'] as const) {
      const t = SORENESS_LABELS[lang];
      for (const z of BODY_ZONES) expect(t.zones[z].length > 0).toBe(true);
      const all = [t.subtitle, ...Object.values(t.severity), t.referHint].join(' ');
      expect(/диагноз|лечени|травм|diagnoz|traum|ārstē|diagnos|injur|treat/i.test(all)).toBe(false);
    }
  });
});
