import { describe, it, expect } from 'vitest';
import { displayCount, examStorm, stormThreshold } from './exam-storm';

const TODAY = '2026-10-01';
const a = (examDates: string[], matchDates: string[] = []) => ({ examDates, matchDates });

describe('stormThreshold', () => {
  it('a third of the team, never fewer than 3', () => {
    expect(stormThreshold(0)).toBe(3);
    expect(stormThreshold(4)).toBe(3);
    expect(stormThreshold(9)).toBe(3);
    expect(stormThreshold(10)).toBe(4);
    expect(stormThreshold(20)).toBe(7);
  });
});

describe('examStorm', () => {
  it('window = exam day and the 3 days before it (same as the engine)', () => {
    const s = examStorm([a(['2026-10-05'])], TODAY, 7);
    expect(s.days.map((d) => d.inWindow)).toEqual([0, 1, 1, 1, 1, 0, 0]);
    expect(s.days.map((d) => d.examsOnDay)).toEqual([0, 0, 0, 0, 1, 0, 0]);
  });

  it('storm when enough athletes overlap; consecutive days merge into one range', () => {
    const team = [a(['2026-10-05']), a(['2026-10-05']), a(['2026-10-06']), a([])];
    const s = examStorm(team, TODAY, 10);
    // 10-02..10-05: all three exams in window except 10-02 (only the two on 10-05) — threshold 3
    expect(s.days.filter((d) => d.storm).map((d) => d.date)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05']);
    expect(s.storms).toEqual([{ from: '2026-10-03', to: '2026-10-05', peak: 3 }]);
  });

  it('two separate storms stay separate', () => {
    const team = [a(['2026-10-02', '2026-10-12']), a(['2026-10-02', '2026-10-12']), a(['2026-10-02', '2026-10-12'])];
    const s = examStorm(team, TODAY, 14);
    expect(s.storms.map((r) => [r.from, r.to])).toEqual([
      ['2026-10-01', '2026-10-02'],
      ['2026-10-09', '2026-10-12'],
    ]);
  });

  it('marks matches that fall on a storm day', () => {
    const team = [a(['2026-10-05'], ['2026-10-04']), a(['2026-10-05'], ['2026-10-04']), a(['2026-10-05']), a([], ['2026-10-09'])];
    const s = examStorm(team, TODAY, 10);
    expect(s.days.find((d) => d.date === '2026-10-04')?.matches).toBe(2);
    expect(s.matchesInStorm).toEqual(['2026-10-04']);
  });

  it('past exams, bad dates and duplicates are ignored; one athlete counts once per day', () => {
    const s = examStorm([a(['2026-09-20', 'soon', '2026-10-02', '2026-10-02', '2026-10-03'])], TODAY, 3);
    expect(s.days.map((d) => d.inWindow)).toEqual([1, 1, 1]);
    expect(s.days.map((d) => d.examsOnDay)).toEqual([0, 1, 1]);
  });

  it('empty team: no storms', () => {
    expect(examStorm([], TODAY).storms).toEqual([]);
  });
});

describe('displayCount', () => {
  it('1 and 2 are never shown exactly', () => {
    expect(displayCount(0)).toEqual({ exact: 0 });
    expect(displayCount(1)).toEqual({ fewerThan: 3 });
    expect(displayCount(2)).toEqual({ fewerThan: 3 });
    expect(displayCount(3)).toEqual({ exact: 3 });
  });
});
