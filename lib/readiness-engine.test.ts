import { describe, it, expect } from 'vitest';
import {
  sessionLoad,
  calculateACWR,
  calculateMonotony,
  calculateHooperIndex,
  calculateHooperBaseline,
  calculateTrainingStreak,
  detectInconsistency,
  calculateReadiness,
  detectSafetyViolations,
  daysBetween,
  type SessionEntry,
  type DailyCheckin,
} from './readiness-engine';

const TODAY = '2026-09-18';

function makeSessions(count: number, rpe: number, minutes: number, endDate = TODAY): SessionEntry[] {
  const out: SessionEntry[] = [];
  const end = new Date(endDate);
  for (let i = 0; i < count; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), rpe, durationMinutes: minutes });
  }
  return out;
}

function makeCheckin(overrides: Partial<DailyCheckin> = {}, date = TODAY): DailyCheckin {
  return {
    date,
    sleepQuality: 5,
    stress: 5,
    fatigue: 5,
    soreness: 5,
    painFlag: false,
    ...overrides,
  };
}

describe('sessionLoad', () => {
  it('multiplies RPE by duration', () => {
    expect(sessionLoad(7, 60)).toBe(420);
    expect(sessionLoad(0, 60)).toBe(0);
  });
});

describe('daysBetween', () => {
  it('is positive when b is after a', () => {
    expect(daysBetween('2026-09-18', '2026-09-21')).toBe(3);
  });
  it('is negative when b is before a', () => {
    expect(daysBetween('2026-09-18', '2026-09-15')).toBe(-3);
  });
  it('is zero for the same day', () => {
    expect(daysBetween('2026-09-18', '2026-09-18')).toBe(0);
  });
});

describe('calculateACWR', () => {
  it('returns null when there is no training history', () => {
    const result = calculateACWR([], TODAY);
    expect(result.acwr).toBeNull();
    expect(result.acute).toBe(0);
  });

  it('returns 1.0 for perfectly steady load', () => {
    // 28 days of identical sessions -> acute week == average chronic week
    const sessions = makeSessions(28, 5, 60);
    const result = calculateACWR(sessions, TODAY);
    expect(result.acwr).toBeCloseTo(1.0, 5);
  });

  it('flags a spike when acute load is far above chronic', () => {
    // light baseline for the first 21 days, heavy for the most recent 7
    const baseline = makeSessions(21, 3, 30, '2026-08-28'); // ends before the spike window
    const spike = makeSessions(7, 9, 90, TODAY);
    const result = calculateACWR([...baseline, ...spike], TODAY);
    expect(result.acwr).toBeGreaterThan(1.5);
  });

  it('never divides by zero (chronic=0 guarded)', () => {
    const result = calculateACWR([], TODAY);
    expect(result.acwr).toBeNull();
  });

  it('regression: a single ever-logged session must NOT produce a false ACWR spike', () => {
    // Bug caught during live testing on 2026-09-18: a brand-new user's very
    // first workout made acute and chronic collapse onto the same one data
    // point, producing an artificial ACWR of exactly 4.0 — flagging a
    // healthy first session as a dangerous overtraining spike.
    const sessions: SessionEntry[] = [{ date: TODAY, rpe: 7, durationMinutes: 60 }];
    const result = calculateACWR(sessions, TODAY);
    expect(result.acwr).toBeNull();
  });

  it('starts reporting a real ACWR once enough history has accumulated', () => {
    const sessions = makeSessions(10, 5, 60); // 10 days of steady history, above the 7-day floor
    const result = calculateACWR(sessions, TODAY);
    expect(result.acwr).not.toBeNull();
  });
});

describe('calculateMonotony', () => {
  it('returns null when the week has zero load', () => {
    expect(calculateMonotony([], TODAY)).toBeNull();
  });

  it('returns null when load is perfectly flat (stddev 0)', () => {
    const sessions = makeSessions(7, 5, 60);
    expect(calculateMonotony(sessions, TODAY)).toBeNull();
  });

  it('is defined and positive when load varies day to day', () => {
    const sessions: SessionEntry[] = [
      { date: TODAY, rpe: 8, durationMinutes: 60 },
      { date: '2026-09-16', rpe: 2, durationMinutes: 20 },
    ];
    const monotony = calculateMonotony(sessions, TODAY);
    expect(monotony).not.toBeNull();
    expect(monotony as number).toBeGreaterThan(0);
  });
});

describe('calculateHooperIndex', () => {
  it('inverts the 1-7 "higher=better" scale into "higher=worse"', () => {
    // best possible day: all 7s -> should produce the LOWEST index (4)
    const best = makeCheckin({ sleepQuality: 7, stress: 7, fatigue: 7, soreness: 7 });
    expect(calculateHooperIndex(best)).toBe(4);

    // worst possible day: all 1s -> should produce the HIGHEST index (28)
    const worst = makeCheckin({ sleepQuality: 1, stress: 1, fatigue: 1, soreness: 1 });
    expect(calculateHooperIndex(worst)).toBe(28);
  });
});

describe('calculateHooperBaseline', () => {
  it('returns null with fewer than 3 prior data points', () => {
    const checkins = [makeCheckin({}, '2026-09-16'), makeCheckin({}, '2026-09-17')];
    expect(calculateHooperBaseline(checkins, TODAY)).toBeNull();
  });

  it('averages prior days, excluding today', () => {
    const checkins = [
      makeCheckin({ sleepQuality: 7, stress: 7, fatigue: 7, soreness: 7 }, '2026-09-14'), // index 4
      makeCheckin({ sleepQuality: 7, stress: 7, fatigue: 7, soreness: 7 }, '2026-09-15'), // index 4
      makeCheckin({ sleepQuality: 7, stress: 7, fatigue: 7, soreness: 7 }, '2026-09-16'), // index 4
      makeCheckin({ sleepQuality: 1, stress: 1, fatigue: 1, soreness: 1 }, TODAY), // must be excluded
    ];
    expect(calculateHooperBaseline(checkins, TODAY)).toBe(4);
  });
});

describe('calculateTrainingStreak', () => {
  it('is 0 with no sessions', () => {
    expect(calculateTrainingStreak([], TODAY)).toBe(0);
  });

  it('counts consecutive days ending today, stops at the first gap', () => {
    const sessions: SessionEntry[] = [
      { date: TODAY, rpe: 5, durationMinutes: 60 },
      { date: '2026-09-17', rpe: 5, durationMinutes: 60 },
      { date: '2026-09-16', rpe: 5, durationMinutes: 60 },
      // gap on 09-15
      { date: '2026-09-14', rpe: 5, durationMinutes: 60 },
    ];
    expect(calculateTrainingStreak(sessions, TODAY)).toBe(3);
  });
});

describe('detectInconsistency', () => {
  it('flags low reported fatigue against a high ACWR', () => {
    const checkin = makeCheckin({ fatigue: 7 });
    const flags = detectInconsistency(checkin, 2.0, 0);
    expect(flags.length).toBeGreaterThan(0);
  });

  it('does not flag when fatigue is high (honest self-report) even with high ACWR', () => {
    const checkin = makeCheckin({ fatigue: 1 });
    const flags = detectInconsistency(checkin, 2.0, 0);
    expect(flags).toHaveLength(0);
  });

  it('does not flag when ACWR is null (not enough data)', () => {
    const checkin = makeCheckin({ fatigue: 7 });
    const flags = detectInconsistency(checkin, null, 0);
    expect(flags).toHaveLength(0);
  });
});

describe('calculateReadiness — integration scenarios', () => {
  it('new user with zero history gets a neutral green score, no crash', () => {
    const result = calculateReadiness([], [], TODAY);
    expect(result.zone).toBe('green');
    expect(result.score).toBe(100);
    expect(result.penalties).toHaveLength(0);
  });

  it('pain ALWAYS forces the red zone, even with a perfect training history', () => {
    const sessions = makeSessions(28, 4, 45);
    const checkins = [makeCheckin({ painFlag: true, sleepQuality: 7, stress: 7, fatigue: 7, soreness: 7 })];
    const result = calculateReadiness(sessions, checkins, TODAY);
    expect(result.zone).toBe('red');
    expect(result.isPainBlocked).toBe(true);
  });

  it('a sharp load spike (ACWR > 1.5) pushes the score into red or yellow', () => {
    const baseline = makeSessions(21, 3, 30, '2026-08-28');
    const spike = makeSessions(7, 9, 90, TODAY);
    const checkins = [makeCheckin()];
    const result = calculateReadiness([...baseline, ...spike], checkins, TODAY);
    expect(result.acwr).toBeGreaterThan(1.5);
    expect(['red', 'yellow']).toContain(result.zone);
    expect(result.penalties.some((p) => p.reason.includes('ACWR'))).toBe(true);
  });

  it('training every day for 2+ weeks straight triggers a rest-day penalty', () => {
    const sessions = makeSessions(14, 5, 45);
    const checkins = [makeCheckin()];
    const result = calculateReadiness(sessions, checkins, TODAY);
    expect(result.trainingStreak).toBeGreaterThanOrEqual(14);
    expect(result.penalties.some((p) => p.reason.includes('без отдыха'))).toBe(true);
  });

  it('an exam within 3 days applies a penalty even with a perfect physical profile', () => {
    const sessions = makeSessions(28, 5, 60);
    const checkins = [makeCheckin({ sleepQuality: 7, stress: 7, fatigue: 7, soreness: 7 })];
    const withExam = calculateReadiness(sessions, checkins, TODAY, { examDates: ['2026-09-19'] });
    const withoutExam = calculateReadiness(sessions, checkins, TODAY, {});
    expect(withExam.score).toBeLessThan(withoutExam.score);
  });

  it('score is always clamped between 0 and 100', () => {
    const sessions = makeSessions(28, 10, 180); // extreme overload every day
    const checkins = [makeCheckin({ sleepQuality: 1, stress: 1, fatigue: 1, soreness: 1, painFlag: true })];
    const result = calculateReadiness(sessions, checkins, TODAY, {
      examDates: ['2026-09-19'],
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('detectSafetyViolations', () => {
  it('blocks on reported pain regardless of everything else', () => {
    const checkin = makeCheckin({ painFlag: true, painZone: 'knee' });
    const violations = detectSafetyViolations(checkin, TODAY, {});
    expect(violations.some((v) => v.code === 'PAIN_REPORTED' && v.severity === 'block')).toBe(true);
  });

  it('blocks heavy work on match day', () => {
    const violations = detectSafetyViolations(undefined, TODAY, { matchDates: [TODAY] });
    expect(violations.some((v) => v.code === 'MATCH_DAY')).toBe(true);
  });

  it('blocks heavy work the day before a match', () => {
    const violations = detectSafetyViolations(undefined, TODAY, { matchDates: ['2026-09-19'] });
    expect(violations.some((v) => v.code === 'PRE_MATCH')).toBe(true);
  });

  it('blocks heavy work the day after a match', () => {
    const violations = detectSafetyViolations(undefined, TODAY, { matchDates: ['2026-09-17'] });
    expect(violations.some((v) => v.code === 'POST_MATCH')).toBe(true);
  });

  it('returns no violations on an ordinary day with no pain and no nearby match', () => {
    const checkin = makeCheckin({ painFlag: false });
    const violations = detectSafetyViolations(checkin, TODAY, { matchDates: ['2026-10-01'] });
    expect(violations).toHaveLength(0);
  });

  it('can report multiple simultaneous violations (pain + match day)', () => {
    const checkin = makeCheckin({ painFlag: true });
    const violations = detectSafetyViolations(checkin, TODAY, { matchDates: [TODAY] });
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });
});
