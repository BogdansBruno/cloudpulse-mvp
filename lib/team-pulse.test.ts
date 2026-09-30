import { describe, it, expect } from 'vitest';
import { parsePulse, pulseLevel, pulseSuggestions, pulseTrend, type PulseDay } from './team-pulse';

const day = (date: string, checkedIn: number, strained: PulseDay['strained'], extra: Partial<PulseDay> = {}): PulseDay => ({
  date,
  teamSize: 12,
  checkedIn,
  stressHigh: null,
  sleepPoor: null,
  fatigueHigh: null,
  sorenessHigh: null,
  strained,
  ...extra,
});

describe('parsePulse — database rows, small groups stay hidden', () => {
  it('-1 becomes "fewer", null stays null, bad rows are dropped', () => {
    const rows = parsePulse([
      { day: '2026-10-02', team_size: 5, checked_in: 4, stress_high: -1, sleep_poor: -1, fatigue_high: 0, soreness_high: 3, strained: 3 },
      { day: '2026-10-01', team_size: 5, checked_in: 1, stress_high: null, sleep_poor: null, fatigue_high: null, soreness_high: null, strained: null },
      { day: 'yesterday' },
      null,
    ]);
    expect(rows.map((r) => r.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect([rows[1].stressHigh, rows[1].fatigueHigh, rows[1].sorenessHigh, rows[1].strained]).toEqual(['fewer', 0, 3, 3]);
    expect(rows[0].strained).toBeNull();
  });
});

describe('pulseLevel — a third = watch, half = high, never below 3 people', () => {
  it('levels', () => {
    expect(pulseLevel(day('d', 2, null))).toBe('too_few');
    expect(pulseLevel(day('d', 10, 'fewer'))).toBe('calm');
    expect(pulseLevel(day('d', 10, 4))).toBe('watch');
    expect(pulseLevel(day('d', 10, 5))).toBe('high');
    expect(pulseLevel(day('d', 4, 3))).toBe('high');
    expect(pulseLevel(day('d', 12, 3))).toBe('calm');
  });
});

describe('pulseTrend — today against the team itself', () => {
  it('needs 3 earlier days; then higher / same / lower', () => {
    const past = [day('2026-10-01', 10, 1), day('2026-10-02', 10, 'fewer'), day('2026-10-03', 10, 'fewer')];
    expect(pulseTrend([day('2026-10-02', 10, 1), day('2026-10-04', 10, 6)], '2026-10-04')).toBeNull();
    expect(pulseTrend([...past, day('2026-10-04', 10, 6)], '2026-10-04')).toBe('higher');
    expect(pulseTrend([...past, day('2026-10-04', 10, 'fewer')], '2026-10-04')).toBe('same');
  });
});

describe('pulseSuggestions — options, not orders', () => {
  it('calm → nothing; high → lighter/game + short talk; exams ahead added when relevant', () => {
    expect(pulseSuggestions('calm', 5)).toEqual([]);
    expect(pulseSuggestions('high', 0)).toEqual(['LIGHTER_OR_GAME', 'SHORT_TALK']);
    expect(pulseSuggestions('watch', 4)).toEqual(['SHORT_TALK', 'EXAMS_AHEAD']);
  });
});
