import { describe, it, expect } from 'vitest';
import {
  AcademicEngine,
  AcademicEngineError,
  DEFAULT_ELIGIBILITY_POLICY,
  convertGrade,
  evaluateEligibility,
  normalizeGrade,
  requiredGrade,
  type AcademicRepository,
} from './AcademicEngine';
import type { AcademicRecord, EligibilityWrite, GradeScale, GradeScaleMap, RecordSource, ScaleType } from '../types/adp';

// Same anchors as the seed rows in adp/db/migrations/001_init_adp_schema.sql.
const SCALES: GradeScaleMap = {
  lv10: { scaleType: 'lv10', minGrade: 1, maxGrade: 10, step: 1, passGrade: 4, anchors: [[1, 0], [4, 0.4], [7, 0.7], [10, 1]], version: 1, approvedBy: 'test' },
  ib7: { scaleType: 'ib7', minGrade: 1, maxGrade: 7, step: 1, passGrade: 4, anchors: [[1, 0], [4, 0.5], [7, 1]], version: 1, approvedBy: 'test' },
  gpa4: { scaleType: 'gpa4', minGrade: 0, maxGrade: 4, step: 0.01, passGrade: 2, anchors: [[0, 0], [2, 0.5], [4, 1]], version: 1, approvedBy: 'test' },
};
const LV: GradeScale = SCALES.lv10;

let seq = 0;
function rec(subject: string, grade: number, opts: { scale?: ScaleType; source?: RecordSource; weight?: number; student?: string } = {}): AcademicRecord {
  seq++;
  return {
    id: `r${seq}`,
    studentId: opts.student ?? 's1',
    subject,
    originalGrade: grade,
    scaleType: opts.scale ?? 'lv10',
    normalizedScore: 0,
    weight: opts.weight ?? 1,
    assessedOn: new Date(Date.UTC(2026, 8, 1) + seq * 86_400_000).toISOString().slice(0, 10),
    source: opts.source ?? 'school',
    createdBy: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };
}

describe('normalizeGrade (parity with adp.normalize_grade)', () => {
  it('matches the SQL values on every scale', () => {
    expect(normalizeGrade(LV, 1)).toBe(0);
    expect(normalizeGrade(LV, 4)).toBe(0.4);
    expect(normalizeGrade(LV, 5)).toBe(0.5);
    expect(normalizeGrade(LV, 9)).toBe(0.9);
    expect(normalizeGrade(LV, 10)).toBe(1);
    expect(normalizeGrade(SCALES.ib7, 5)).toBe(0.6667);
    expect(normalizeGrade(SCALES.gpa4, 3.5)).toBe(0.875);
  });

  it('refuses grades that do not exist on the scale', () => {
    expect(() => normalizeGrade(LV, 11)).toThrow(AcademicEngineError);
    expect(() => normalizeGrade(LV, 7.5)).toThrow('GRADE_OUT_OF_SCALE');
    expect(() => normalizeGrade(SCALES.ib7, 0)).toThrow('GRADE_OUT_OF_SCALE');
    expect(normalizeGrade(SCALES.gpa4, 3.33)).toBe(0.8325);
  });
});

describe('convertGrade (a guide, not an official conversion)', () => {
  it('maps through the common level to the nearest target grade, with a band', () => {
    // lv10 7 -> level 0.70 -> ib7 5.2 -> nearest 5
    const c = convertGrade(LV, SCALES.ib7, 7);
    expect(c.approx).toBe(5);
    expect(c.low <= c.approx && c.approx <= c.high).toBe(true);
  });
});

describe('requiredGrade ("what do I need on the next test")', () => {
  it('finds the lowest real grade that reaches the target', () => {
    // 3 and 4 -> levels 0.30, 0.40; to average 0.40 over three tests: Z = 0.5 -> grade 5
    expect(requiredGrade([{ level: 0.3, weight: 1 }, { level: 0.4, weight: 1 }], 0.4, LV)).toEqual({
      kind: 'reachable',
      grade: 5,
      scaleType: 'lv10',
    });
  });

  it('says honestly when tests alone cannot do it', () => {
    const lows = Array.from({ length: 6 }, () => ({ level: 0, weight: 1 }));
    expect(requiredGrade(lows, 0.4, LV)).toEqual({ kind: 'unreachable' });
  });

  it('says when the target is already secured', () => {
    expect(requiredGrade([{ level: 0.9, weight: 3 }], 0.4, LV)).toEqual({ kind: 'already_secured' });
  });
});

describe('evaluateEligibility — both rules', () => {
  it('has no colour without verified grades (never an invented green)', () => {
    const r = evaluateEligibility([rec('Fizika', 9, { source: 'student' })], SCALES);
    expect(r.statusColor).toBeNull();
    expect(r.reasonCode).toBe('NO_DATA');
    expect(r.ignoredSelfReported).toBe(1);
  });

  it('is green when every subject and the average are clear', () => {
    const r = evaluateEligibility([rec('Matemātika', 8), rec('Fizika', 7), rec('Ķīmija', 9)], SCALES);
    expect(r.statusColor).toBe('green');
    expect(r.reasonCode).toBe('OK');
    expect(r.triggers).toEqual([]);
  });

  it('is red when one subject fails, even with a high average', () => {
    const r = evaluateEligibility([rec('Matemātika', 10), rec('Vēsture', 10), rec('Fizika', 3)], SCALES);
    expect(r.statusColor).toBe('red');
    expect(r.reasonCode).toBe('BELOW_THRESHOLD');
    expect(r.triggers).toContainEqual({ kind: 'SUBJECT_BELOW_PASS', subject: 'Fizika' });
    const fizika = r.subjects.find((s) => s.subject === 'Fizika');
    expect(fizika?.state).toBe('failing');
    // 3 -> level 0.2667; to average 0.40 over two tests: Z = 0.5333 -> lowest real grade is 6 (0.60)
    expect(fizika?.nextNeeded).toEqual({ kind: 'reachable', grade: 6, scaleType: 'lv10' });
  });

  it('is red when the average is below the agreed threshold, even with no failing subject', () => {
    const strict = { ...DEFAULT_ELIGIBILITY_POLICY, averageThreshold: 0.6 };
    const r = evaluateEligibility([rec('Matemātika', 5), rec('Fizika', 5)], SCALES, strict);
    expect(r.statusColor).toBe('red');
    expect(r.triggers).toContainEqual({ kind: 'AVERAGE_BELOW_THRESHOLD' });
    expect(r.subjects.every((s) => s.state !== 'failing')).toBe(true);
  });

  it('is yellow when a subject sits just above the pass line', () => {
    const r = evaluateEligibility([rec('Matemātika', 9), rec('Fizika', 4)], SCALES);
    expect(r.statusColor).toBe('yellow');
    expect(r.reasonCode).toBe('NEAR_THRESHOLD');
    expect(r.triggers).toContainEqual({ kind: 'SUBJECT_NEAR_PASS', subject: 'Fizika' });
  });

  it('weights grades and treats "Fizika" and "fizika " as one subject', () => {
    const r = evaluateEligibility([rec('Fizika', 3, { weight: 1 }), rec('fizika ', 9, { weight: 3 })], SCALES);
    expect(r.subjects.length).toBe(1);
    expect(r.subjects[0].averageLevel).toBe(0.7417); // (0.2667 + 3 * 0.9) / 4
  });

  it('counts self-reported grades only when the policy allows it', () => {
    const records = [rec('Fizika', 3, { source: 'student' }), rec('Matemātika', 8)];
    expect(evaluateEligibility(records, SCALES).statusColor).toBe('green');
    expect(evaluateEligibility(records, SCALES, { ...DEFAULT_ELIGIBILITY_POLICY, verifiedOnly: false }).statusColor).toBe('red');
  });

  it('mixes scales through levels', () => {
    const r = evaluateEligibility([rec('English', 6, { scale: 'ib7' }), rec('Matemātika', 8)], SCALES);
    expect(r.statusColor).toBe('green');
  });

  it('rejects a nonsensical policy', () => {
    expect(() => evaluateEligibility([], SCALES, { ...DEFAULT_ELIGIBILITY_POLICY, margin: 2 })).toThrow('BAD_POLICY');
  });
});

describe('AcademicEngine.calculateEligibilityStatus', () => {
  it('stores only colour + reason code, and ignores other students\' rows', async () => {
    const saved: EligibilityWrite[] = [];
    const repo: AcademicRepository = {
      getRecords: async () => [rec('Fizika', 3), rec('Fizika', 10, { student: 'someone-else' })],
      getScales: async () => SCALES,
      saveEligibility: async (w) => {
        saved.push(w);
      },
    };
    const result = await new AcademicEngine(repo).calculateEligibilityStatus('s1');
    expect(result.statusColor).toBe('red');
    expect(saved).toEqual([{ studentId: 's1', statusColor: 'red', reasonCode: 'BELOW_THRESHOLD' }]);
  });
});
