import { describe, it, expect } from 'vitest';
import {
  dueFollowup,
  openRtp,
  parseClearances,
  parseFollowups,
  returnToPlayStatus,
  rtpByAthlete,
  type RtpCheckin,
  type RtpFollowup,
} from './return-to-play';

const TODAY = '2026-10-10';
const ok = (date: string): RtpCheckin => ({ date, painFlag: false, painZone: null });
const pain = (date: string, zone: string | null = 'knee'): RtpCheckin => ({ date, painFlag: true, painZone: zone });
const answer = (dayOffset: 1 | 3, painDate = '2026-10-08'): RtpFollowup => ({
  painDate,
  dayOffset,
  trend: 'better',
  sawSpecialist: false,
  answeredAt: '2026-10-09T08:00:00+00:00',
});

describe('returnToPlayStatus', () => {
  it('no pain in the last 28 days — nothing to show', () => {
    expect(returnToPlayStatus([ok('2026-10-09'), pain('2026-09-10')], [], [], TODAY)).toEqual({ state: 'none' });
  });

  it('pain today → restricted, 0 clean days, no question yet', () => {
    const s = returnToPlayStatus([ok('2026-10-09'), pain(TODAY, ' knee ')], [], [], TODAY);
    expect(s).toEqual({
      state: 'restricted',
      painDate: TODAY,
      painZone: 'knee',
      cleanDays: 0,
      clearedAt: null,
      followups: [],
      dueFollowup: null,
    });
  });

  it('one clean day is not enough; two make it "ready" (waiting for the coach)', () => {
    const one = returnToPlayStatus([pain('2026-10-08'), ok('2026-10-09')], [], [], TODAY);
    expect(one.state === 'restricted' && one.cleanDays).toBe(1);
    const two = returnToPlayStatus([pain('2026-10-08'), ok('2026-10-09'), ok(TODAY)], [], [], TODAY);
    expect(two.state).toBe('ready');
  });

  it('a day without a check-in is not a clean day', () => {
    // pain on 06, then silence until today
    const s = returnToPlayStatus([pain('2026-10-06'), ok(TODAY)], [], [], TODAY);
    expect(s.state === 'restricted' && s.cleanDays).toBe(1);
  });

  it('new pain restarts the count — the episode is the latest pain', () => {
    const s = returnToPlayStatus(
      [pain('2026-10-05', 'ankle'), ok('2026-10-06'), ok('2026-10-07'), pain('2026-10-08', 'knee'), ok('2026-10-09')],
      [{ painDate: '2026-10-05', clearedAt: '2026-10-07T18:00:00+00:00' }],
      [],
      TODAY
    );
    expect(s).toEqual(expect.objectContaining({ state: 'restricted', painDate: '2026-10-08', painZone: 'knee', cleanDays: 1 }));
  });

  it('coach clearance for THIS episode → cleared, no more questions', () => {
    const s = returnToPlayStatus(
      [pain('2026-10-06'), ok('2026-10-07'), ok('2026-10-08')],
      [{ painDate: '2026-10-06', clearedAt: '2026-10-08T17:00:00+00:00' }],
      [],
      TODAY
    );
    expect(s).toEqual(expect.objectContaining({ state: 'cleared', clearedAt: '2026-10-08T17:00:00+00:00', dueFollowup: null }));
  });

  it('future-dated rows are ignored', () => {
    expect(returnToPlayStatus([pain('2026-10-11')], [], [], TODAY)).toEqual({ state: 'none' });
  });

  it('only this episode\'s answers are attached, day 1 first', () => {
    const s = returnToPlayStatus(
      [pain('2026-10-08'), ok('2026-10-09')],
      [],
      [answer(3), answer(1), answer(1, '2026-09-20')],
      TODAY
    );
    expect(s.state !== 'none' && s.followups.map((f) => [f.painDate, f.dayOffset])).toEqual([
      ['2026-10-08', 1],
      ['2026-10-08', 3],
    ]);
  });
});

describe('dueFollowup', () => {
  it('day +1 and day +3 questions, each once', () => {
    expect(dueFollowup('2026-10-08', [], '2026-10-08')).toBeNull();
    expect(dueFollowup('2026-10-08', [], '2026-10-09')).toBe(1);
    expect(dueFollowup('2026-10-08', [{ dayOffset: 1 }], '2026-10-09')).toBeNull();
    expect(dueFollowup('2026-10-08', [{ dayOffset: 1 }], '2026-10-10')).toBeNull();
    expect(dueFollowup('2026-10-08', [{ dayOffset: 1 }], '2026-10-11')).toBe(3);
    expect(dueFollowup('2026-10-08', [{ dayOffset: 1 }, { dayOffset: 3 }], '2026-10-12')).toBeNull();
  });

  it('first visit on day 4 asks only the day-3 question', () => {
    expect(dueFollowup('2026-10-08', [], '2026-10-12')).toBe(3);
  });
});

describe('openRtp / rtpByAthlete', () => {
  it('only restricted and ready are "open"; everyone gets a status', () => {
    const map = rtpByAthlete(
      ['anna', 'max', 'liga'],
      [
        { userId: 'max', ...pain('2026-10-09') },
        { userId: 'anna', ...ok('2026-10-09') },
      ],
      [],
      [],
      TODAY
    );
    expect(openRtp(map.get('max')!)).toEqual({ state: 'restricted', cleanDays: 0, painDate: '2026-10-09' });
    expect(openRtp(map.get('anna')!)).toBeNull();
    expect(map.get('liga')).toEqual({ state: 'none' });
  });
});

describe('parsing', () => {
  it('keeps valid rows, drops malformed ones', () => {
    expect(
      parseFollowups([
        { athlete_id: 'a', pain_date: '2026-10-08', day_offset: 1, trend: 'same', saw_specialist: true, answered_at: 'x' },
        { athlete_id: 'a', pain_date: '2026-10-08', day_offset: 2, trend: 'same', saw_specialist: true, answered_at: 'x' },
        { athlete_id: 'a', pain_date: '2026-10-08', day_offset: 3, trend: 'fine', saw_specialist: true, answered_at: 'x' },
      ])
    ).toEqual([
      { athleteId: 'a', painDate: '2026-10-08', dayOffset: 1, trend: 'same', sawSpecialist: true, answeredAt: 'x' },
    ]);
    expect(parseClearances([{ athlete_id: 'a', pain_date: 'soon', cleared_at: 'x' }, null])).toEqual([]);
  });
});
