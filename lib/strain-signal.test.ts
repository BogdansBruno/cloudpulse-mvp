import { describe, it, expect } from 'vitest';
import { strainSignal, strainInputFromPenalties, examInDays } from './strain-signal';

describe('strainSignal', () => {
  it('calm day: nothing', () => {
    expect(strainSignal({ acwr: 1.0, zone: 'green' })).toEqual({ level: 'none', factors: [], spike: false });
  });
  it('no data is never an alarm', () => {
    expect(strainSignal({ acwr: null, zone: null }).level).toBe('none');
  });
  it('one factor alone is not a signal', () => {
    expect(strainSignal({ acwr: 1.0, zone: 'green', examSoon: true }).level).toBe('none');
    expect(strainSignal({ acwr: 1.4, zone: 'green' }).level).toBe('none');
  });
  it('two factors: watch', () => {
    const s = strainSignal({ acwr: 1.4, zone: 'green', examSoon: true });
    expect(s.level).toBe('watch');
    expect(s.factors).toEqual(['load', 'exam']);
  });
  it('rising load with a non-green zone: watch', () => {
    expect(strainSignal({ acwr: 1.35, zone: 'yellow' }).level).toBe('watch');
  });
  it('three factors: high', () => {
    expect(strainSignal({ acwr: 1.4, zone: 'yellow', examSoon: true, wellnessWorse: true }).level).toBe('high');
  });
  it('a spike is high on its own', () => {
    const s = strainSignal({ acwr: 1.6, zone: 'green' });
    expect(s.level).toBe('high');
    expect(s.spike).toBe(true);
  });
  it('red zone with any factor: high; red zone alone: none (the engine already says red)', () => {
    expect(strainSignal({ acwr: 1.0, zone: 'red', noRest: true }).level).toBe('high');
    expect(strainSignal({ acwr: 1.0, zone: 'red' }).level).toBe('none');
  });
  it('limits are the engine limits: 1.3 is not rising, 1.5 is not a spike', () => {
    expect(strainSignal({ acwr: 1.3, zone: 'yellow' }).factors).toEqual([]);
    expect(strainSignal({ acwr: 1.5, zone: 'green' }).spike).toBe(false);
  });
  it('reads engine penalty codes', () => {
    const i = strainInputFromPenalties(1.4, 'yellow', ['EXAM_SOON', 'NO_REST_STREAK', 'ACWR_RISING']);
    expect(strainSignal(i).factors).toEqual(['load', 'rest', 'exam']);
    expect(strainSignal(strainInputFromPenalties(1.0, 'green', undefined)).level).toBe('none');
  });
});

describe('examInDays', () => {
  it('finds the nearest exam inside 3 days', () => {
    expect(examInDays('2026-11-02', ['2026-11-04'])).toBe(2);
    expect(examInDays('2026-11-02', ['2026-11-02'])).toBe(0);
  });
  it('outside the window or junk: null', () => {
    expect(examInDays('2026-11-02', ['2026-11-07'])).toBeNull();
    expect(examInDays('2026-11-02', ['soon'])).toBeNull();
    expect(examInDays('2026-11-02', null)).toBeNull();
  });
});
