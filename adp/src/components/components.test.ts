import { describe, it, expect } from 'vitest';
import { axisPoint, cleanLevel, knownPoints, polygonPoints, trendOf, visibleAxes, type RadarValues } from './radar';
import { cardModel, cleanRejectNote, type TeacherRequestView } from './reschedule';
import { RADAR_LABELS, RESCHEDULE_LABELS, formatDay } from './labels';

const C = { x: 100, y: 100 };
const FULL: RadarValues = { physical: 0.8, discipline: 0.6, academics: 0.5, recovery: 0.7 };

describe('radar rules', () => {
  it('hides the health-based Recovery axis from anyone but the athlete', () => {
    expect(visibleAxes('athlete')).toEqual(['physical', 'discipline', 'academics', 'recovery']);
    expect(visibleAxes('shared')).toEqual(['physical', 'discipline', 'academics']);
  });

  it('treats out-of-range values as no data instead of clamping them', () => {
    expect(cleanLevel(0.5)).toBe(0.5);
    expect(cleanLevel(1.2)).toBeNull();
    expect(cleanLevel(-0.1)).toBeNull();
    expect(cleanLevel(Number.NaN)).toBeNull();
  });

  it('reads small changes as "no change"', () => {
    expect(trendOf(0.62, 0.6)).toBe('same');
    expect(trendOf(0.7, 0.6)).toBe('up');
    expect(trendOf(0.5, 0.6)).toBe('down');
    expect(trendOf(null, 0.6)).toBe('no_data');
  });

  it('starts at 12 o\'clock and goes clockwise', () => {
    expect(axisPoint(0, 4, 1, 50, C)).toEqual({ x: 100, y: 50 });
    expect(axisPoint(1, 4, 1, 50, C)).toEqual({ x: 150, y: 100 });
  });

  it('draws no polygon when an axis has no data (a missing value is not a zero)', () => {
    expect(polygonPoints(FULL, visibleAxes('athlete'), 50, C)).toBe('100,60 130,100 100,125 65,100');
    const partial: RadarValues = { ...FULL, academics: null };
    expect(polygonPoints(partial, visibleAxes('athlete'), 50, C)).toBeNull();
    expect(knownPoints(partial, visibleAxes('athlete'), 50, C).map((p) => p.axis)).toEqual([
      'physical',
      'discipline',
      'recovery',
    ]);
  });

  it('has no labels for comparing with other players', () => {
    const text = JSON.stringify(RADAR_LABELS).toLowerCase();
    for (const word of ['team average', 'rank', 'рейтинг', 'среднее по команде', 'reitings']) {
      expect(text.includes(word)).toBe(false);
    }
  });
});

describe('teacher reschedule card rules', () => {
  const base: TeacherRequestView = {
    id: 'r1',
    subject: 'Matemātika',
    eventDate: '2026-10-10',
    reason: 'competition',
    reasonNote: '  National cup  ',
    proposedDates: ['2026-10-14', '2026-10-12', '2026-10-12', '2026-10-10'],
    status: 'pending',
    approvedDate: null,
  };

  it('offers each proposed date once, sorted, never the original date', () => {
    const m = cardModel(base);
    expect(m.dateChoices).toEqual(['2026-10-12', '2026-10-14']);
    expect(m.canAct).toBe(true);
    expect(m.note).toBe('National cup');
  });

  it('never shows a note behind a medical reason', () => {
    expect(cardModel({ ...base, reason: 'medical', reasonNote: 'should not be here' }).note).toBeNull();
  });

  it('locks the card once decided (by the server or by this card)', () => {
    const decided = cardModel({ ...base, status: 'approved', approvedDate: '2026-10-12' });
    expect(decided.canAct).toBe(false);
    expect(decided.dateChoices).toEqual([]);
    expect(decided.approvedDate).toBe('2026-10-12');

    const local = cardModel(base, { status: 'approved', date: '2026-10-14' });
    expect(local.state).toBe('approved');
    expect(local.approvedDate).toBe('2026-10-14');
    expect(cardModel(base, { status: 'rejected' }).canAct).toBe(false);
  });

  it('cleans the decline note to the database limit', () => {
    expect(cleanRejectNote('   ')).toBeNull();
    expect(cleanRejectNote('  see   me  ')).toBe('see me');
    expect(cleanRejectNote('x'.repeat(500))?.length).toBe(280);
  });

  it('has every label in all three languages', () => {
    expect(Object.keys(RESCHEDULE_LABELS)).toEqual(['ru', 'lv', 'en']);
    expect(RESCHEDULE_LABELS.lv.moveTo(formatDay('2026-10-12', 'lv'))).toContain('12');
  });
});
