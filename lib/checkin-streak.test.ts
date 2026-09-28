import { describe, it, expect } from 'vitest';
import {
  addDays,
  todayUtc,
  computeCheckinStreak,
  recentDays,
  teamCheckinSummary,
  datesByAthlete,
} from './checkin-streak';

const TODAY = '2026-10-01';
const back = (n: number) => addDays(TODAY, -n);

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('uses the UTC date, like /api/checkin', () => {
    expect(todayUtc(new Date('2026-10-01T23:30:00Z'))).toBe('2026-10-01');
  });
});

describe('computeCheckinStreak', () => {
  it('is zero with no check-ins', () => {
    expect(computeCheckinStreak([], TODAY)).toEqual({ current: 0, best: 0, doneToday: false });
  });

  it('counts consecutive days ending today', () => {
    const s = computeCheckinStreak([back(2), back(1), TODAY], TODAY);
    expect(s).toEqual({ current: 3, best: 3, doneToday: true });
  });

  it('keeps yesterday’s streak alive while today is still open', () => {
    const s = computeCheckinStreak([back(3), back(2), back(1)], TODAY);
    expect(s.current).toBe(3);
    expect(s.doneToday).toBe(false);
  });

  it('drops to zero after a whole missed day', () => {
    expect(computeCheckinStreak([back(4), back(3), back(2)], TODAY).current).toBe(0);
  });

  it('remembers the best run even after a break', () => {
    const s = computeCheckinStreak([back(9), back(8), back(7), back(6), back(5), back(1), TODAY], TODAY);
    expect(s.current).toBe(2);
    expect(s.best).toBe(5);
  });

  it('ignores duplicates, order and future dates', () => {
    const s = computeCheckinStreak([TODAY, back(1), TODAY, back(1), addDays(TODAY, 1)], TODAY);
    expect(s).toEqual({ current: 2, best: 2, doneToday: true });
  });
});

describe('recentDays', () => {
  it('lists the last N days oldest first with done flags', () => {
    const days = recentDays([back(1), TODAY], TODAY, 3);
    expect(days).toEqual([
      { date: back(2), done: false },
      { date: back(1), done: true },
      { date: TODAY, done: true },
    ]);
  });
});

describe('teamCheckinSummary', () => {
  it('counts who checked in today and lists who has not', () => {
    const rows = [
      { user_id: 'a', date: TODAY },
      { user_id: 'b', date: back(1) },
      { user_id: 'c', date: TODAY },
    ];
    expect(teamCheckinSummary(['a', 'b', 'c', 'd'], rows, TODAY)).toEqual({ done: 2, total: 4, missing: ['b', 'd'] });
  });

  it('counts an athlete in two teams once', () => {
    expect(teamCheckinSummary(['a', 'a', 'b'], [{ user_id: 'a', date: TODAY }], TODAY)).toEqual({
      done: 1,
      total: 2,
      missing: ['b'],
    });
  });

  it('groups rows per athlete', () => {
    const map = datesByAthlete([
      { user_id: 'a', date: TODAY },
      { user_id: 'a', date: back(1) },
      { user_id: 'b', date: TODAY },
    ]);
    expect(map.get('a')).toEqual([TODAY, back(1)]);
    expect(map.get('b')).toEqual([TODAY]);
    expect(map.get('c')).toBeUndefined();
  });
});
