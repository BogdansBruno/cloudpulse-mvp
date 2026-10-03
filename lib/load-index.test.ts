import { describe, expect, it } from 'vitest';
import { baselineDelta, loadIndex, loadZone, targetLoadRange, usualDailyLoad } from './load-index';

describe('ADP Load Index', () => {
  it('usual day = usual week / 7, null while the base is building', () => {
    expect(usualDailyLoad(1750)).toBe(250);
    expect(usualDailyLoad(0)).toBeNull();
    expect(usualDailyLoad(null)).toBeNull();
  });

  it('50 is an ordinary day, capped at 100', () => {
    expect(loadIndex(250, 250)).toBe(50);
    expect(loadIndex(240, 250)).toBe(48); // demo athlete, today
    expect(loadIndex(520, 250)).toBe(100); // demo athlete, heaviest day → capped
    expect(loadIndex(0, 250)).toBe(0); // rest day
    expect(loadIndex(240, null)).toBeNull();
    expect(loadIndex(null, 250)).toBeNull();
  });

  it('zone borders follow the ACWR thresholds 0.8 and 1.5', () => {
    expect(loadZone(loadIndex(200, 250) as number)).toBe('light'); // 0.8 × usual = 40
    expect(loadZone(41)).toBe('optimal');
    expect(loadZone(loadIndex(375, 250) as number)).toBe('optimal'); // 1.5 × usual = 75
    expect(loadZone(76)).toBe('overload');
  });

  it('target corridor comes from readiness and never enters overload', () => {
    expect(targetLoadRange(58)).toEqual({ from: 43, to: 58 });
    expect(targetLoadRange(78)).toEqual({ from: 60, to: 75 });
    expect(targetLoadRange(100)).toEqual({ from: 60, to: 75 });
    expect(targetLoadRange(10)).toEqual({ from: 0, to: 10 });
    expect(targetLoadRange(null)).toBeNull();
  });

  it('baseline delta needs at least 3 earlier days', () => {
    expect(baselineDelta(58, [82, 78, 76, 58, 69, 75])).toEqual({ delta: -15, mean: 73, days: 6 });
    expect(baselineDelta(58, [70, 72])).toBeNull();
    expect(baselineDelta(null, [70, 72, 74])).toBeNull();
  });
});
