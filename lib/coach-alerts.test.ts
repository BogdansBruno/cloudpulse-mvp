import { describe, it, expect } from 'vitest';
import {
  athleteAlertStatus,
  coachAlertGroups,
  parseAlert,
  parseAlerts,
  shouldRing,
  upsertAlerts,
  type CoachAlert,
} from './coach-alerts';

const base: CoachAlert = {
  id: 'a1',
  athlete_id: 'max',
  checkin_date: '2026-09-29',
  kind: 'pain',
  pain_zone: 'knee',
  readiness_score: 30,
  created_at: '2026-09-29T15:00:00.123456+00:00',
  cleared_at: null,
  reaction: null,
  reacted_at: null,
  reacted_by: null,
};
const alert = (over: Partial<CoachAlert>): CoachAlert => ({ ...base, ...over });
const roster = new Set(['max', 'anna', 'liga']);

describe('parseAlert', () => {
  it('accepts a row as Supabase sends it and trims the pain zone', () => {
    expect(parseAlert({ ...base, pain_zone: '  knee ' })).toEqual(base);
  });

  it('drops malformed rows instead of crashing the coach screen', () => {
    expect(parseAlert(null)).toBeNull();
    expect(parseAlert({ ...base, kind: 'yellow' })).toBeNull();
    expect(parseAlert({ ...base, checkin_date: 'today' })).toBeNull();
    expect(parseAlert({ ...base, reaction: 'go play' })).toBeNull();
    expect(parseAlert({ ...base, id: 7 })).toBeNull();
    expect(parseAlerts([base, { nope: true }, alert({ id: 'a2' })]).map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('a missing score is "no number", not zero', () => {
    expect(parseAlert({ ...base, readiness_score: null })?.readiness_score).toBeNull();
    expect(parseAlert({ ...base, readiness_score: 'high' })?.readiness_score).toBeNull();
  });
});

describe('upsertAlerts', () => {
  it('replaces by id (Realtime UPDATE) and keeps newest first', () => {
    const older = alert({ id: 'a0', created_at: '2026-09-29T14:00:00+00:00' });
    const answered = alert({ reaction: 'contact', reacted_at: '2026-09-29T15:05:00+00:00', reacted_by: 'coach' });
    const list = upsertAlerts([base, older], [answered]);
    expect(list.map((a) => a.id)).toEqual(['a1', 'a0']);
    expect(list[0].reaction).toBe('contact');
  });
});

describe('coachAlertGroups', () => {
  it('one card per athlete and day; pain first, then newest', () => {
    const rows = [
      alert({ id: 'p1', created_at: '2026-09-29T15:00:00+00:00' }),
      alert({ id: 'p2', created_at: '2026-09-29T15:10:00+00:00', pain_zone: 'ankle' }), // re-submitted
      alert({ id: 'r1', athlete_id: 'anna', kind: 'red', pain_zone: null, readiness_score: 42, created_at: '2026-09-29T16:00:00+00:00' }),
    ];
    const { open, answered } = coachAlertGroups(rows, roster, '2026-09-28');
    expect(open.map((g) => [g.athleteId, g.kind, g.latestId])).toEqual([
      ['max', 'pain', 'p2'],
      ['anna', 'red', 'r1'],
    ]);
    expect(open[0].painZone).toBe('ankle');
    expect(answered).toEqual([]);
  });

  it('a day with pain and a later red row still reads as pain', () => {
    const rows = [
      alert({ id: 'p1', created_at: '2026-09-29T15:00:00+00:00' }),
      alert({ id: 'r1', kind: 'red', pain_zone: null, created_at: '2026-09-29T15:30:00+00:00' }),
    ];
    const [g] = coachAlertGroups(rows, roster, '2026-09-29').open;
    expect(g.kind).toBe('pain');
    expect(g.latestId).toBe('r1');
  });

  it('answered days move to history; a new signal after the answer opens a card again', () => {
    const answeredRow = alert({ reaction: 'rest', reacted_at: '2026-09-29T15:05:00+00:00', reacted_by: 'coach' });
    expect(coachAlertGroups([answeredRow], roster, '2026-09-29')).toEqual({
      open: [],
      answered: [expect.objectContaining({ athleteId: 'max', reaction: 'rest' })],
    });
    const again = alert({ id: 'a2', created_at: '2026-09-29T18:00:00+00:00' });
    const { open, answered } = coachAlertGroups([answeredRow, again], roster, '2026-09-29');
    expect(open.map((g) => [g.latestId, g.reaction])).toEqual([['a2', null]]);
    expect(answered).toEqual([]);
  });

  it('ignores cleared rows, other teams and old days', () => {
    const rows = [
      alert({ id: 'c', cleared_at: '2026-09-29T15:01:00+00:00' }),
      alert({ id: 'x', athlete_id: 'stranger' }),
      alert({ id: 'old', checkin_date: '2026-09-20' }),
    ];
    expect(coachAlertGroups(rows, roster, '2026-09-28')).toEqual({ open: [], answered: [] });
  });
});

describe('shouldRing', () => {
  it('rings only for a new open alert', () => {
    const known = new Set(['a1']);
    expect(shouldRing(alert({ id: 'a2' }), known)).toBe(true);
    expect(shouldRing(base, known)).toBe(false); // already on screen
    expect(shouldRing(alert({ id: 'a3', cleared_at: '2026-09-29T15:01:00+00:00' }), known)).toBe(false);
    expect(shouldRing(alert({ id: 'a4', reaction: 'contact', reacted_at: '2026-09-29T15:01:00+00:00' }), known)).toBe(false);
  });
});

describe('athleteAlertStatus', () => {
  it('none → waiting → answered → waiting again after a new signal', () => {
    expect(athleteAlertStatus([], 'max', '2026-09-29')).toEqual({ state: 'none' });
    expect(athleteAlertStatus([base], 'max', '2026-09-29')).toEqual({ state: 'waiting', kind: 'pain' });

    const answered = alert({ reaction: 'specialist', reacted_at: '2026-09-29T15:05:00+00:00', reacted_by: 'coach' });
    expect(athleteAlertStatus([answered], 'max', '2026-09-29')).toEqual({
      state: 'answered',
      kind: 'pain',
      reaction: 'specialist',
      reactedAt: '2026-09-29T15:05:00+00:00',
    });

    const again = alert({ id: 'a2', created_at: '2026-09-29T18:00:00+00:00' });
    expect(athleteAlertStatus([answered, again], 'max', '2026-09-29').state).toBe('waiting');
  });

  it('a corrected check-in (cleared) shows nothing; other days and athletes do not leak in', () => {
    expect(athleteAlertStatus([alert({ cleared_at: '2026-09-29T15:01:00+00:00' })], 'max', '2026-09-29')).toEqual({
      state: 'none',
    });
    expect(athleteAlertStatus([alert({ checkin_date: '2026-09-28' })], 'max', '2026-09-29').state).toBe('none');
    expect(athleteAlertStatus([alert({ athlete_id: 'anna' })], 'max', '2026-09-29').state).toBe('none');
  });
});
