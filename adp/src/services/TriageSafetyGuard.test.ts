import { describe, it, expect } from 'vitest';
import {
  EMPTY_CONTEXT,
  TriageSafetyGuard,
  triageCheckIn,
  validateCheckIn,
  type SafetyStore,
  type TriageContext,
} from './TriageSafetyGuard';
import type { CheckInDto, DailyStatusWrite, NewSafetyFlag, ReportableSign } from '../types/adp';

const TODAY = '2026-10-01';

function dto(over: Partial<CheckInDto> = {}): CheckInDto {
  return {
    studentId: 's1',
    date: TODAY,
    sleepQuality: 6,
    stress: 5,
    fatigue: 5,
    soreness: 5,
    painReported: false,
    signs: [],
    ...over,
  };
}
const ctx = (over: Partial<TriageContext> = {}): TriageContext => ({ ...EMPTY_CONTEXT, ...over });

describe('validateCheckIn', () => {
  it('accepts a normal check-in', () => {
    expect(validateCheckIn(dto())).toEqual([]);
  });

  it('refuses out-of-range scales, bad dates, stray locations and unknown signs', () => {
    const errors = validateCheckIn(
      dto({
        date: '2026-02-30',
        sleepQuality: 0,
        soreness: 3.5,
        painLocation: 'knee',
        signs: ['sprained_ankle' as ReportableSign],
      })
    );
    expect(errors).toContainEqual({ code: 'INVALID_DATE' });
    expect(errors).toContainEqual({ code: 'SCALE_OUT_OF_RANGE', field: 'sleepQuality' });
    expect(errors).toContainEqual({ code: 'SCALE_OUT_OF_RANGE', field: 'soreness' });
    expect(errors).toContainEqual({ code: 'PAIN_LOCATION_WITHOUT_PAIN' });
    expect(errors).toContainEqual({ code: 'UNKNOWN_SIGN', sign: 'sprained_ankle' });
  });
});

describe('triageCheckIn — the tree', () => {
  it('CLEAR: no block, colour comes from the readiness engine', () => {
    const r = triageCheckIn(dto(), ctx({ readinessColor: 'green' }));
    expect(r.outcome).toBe('CLEAR');
    expect(r.loadBlocked).toBe(false);
    expect(r.statusColor).toBe('green');
    expect(r.flags).toEqual([]);
    expect(r.actions).toEqual([]);
  });

  it('CLEAR without a readiness colour stays "no data", not green', () => {
    expect(triageCheckIn(dto()).statusColor).toBeNull();
  });

  it('PAIN: instantly red + blocked, pain flag, sports doctor within 48 h', () => {
    const r = triageCheckIn(dto({ painReported: true, painLocation: ' knee ' }));
    expect(r.outcome).toBe('PAIN');
    expect(r.statusColor).toBe('red');
    expect(r.loadBlocked).toBe(true);
    expect(r.flags).toEqual([
      { studentId: 's1', flagLevel: 'red', redFlagType: 'pain', source: 'check_in', location: 'knee' },
    ]);
    expect(r.actions[0]).toEqual({ type: 'BLOCK_LOAD' });
    expect(r.actions).toContainEqual({ type: 'BOOK_SPECIALIST', specialist: 'sports_doctor', deadline: '2026-10-03', beforeMatch: null });
    expect(r.actions).toContainEqual({ type: 'ISSUE_SAFETY_PASS' });
    expect(r.actions).toContainEqual({ type: 'FOLLOW_UP', onDates: ['2026-10-02', '2026-10-04'] });
  });

  it('PAIN before a match: book no later than 2 days before it', () => {
    const r = triageCheckIn(dto({ painReported: true }), ctx({ nextMatchDate: '2026-10-04' }));
    expect(r.actions).toContainEqual({ type: 'BOOK_SPECIALIST', specialist: 'sports_doctor', deadline: '2026-10-02', beforeMatch: true });
  });

  it('PAIN the day before a match: book today, flagged as too late for the match', () => {
    const r = triageCheckIn(dto({ painReported: true }), ctx({ nextMatchDate: '2026-10-02' }));
    expect(r.actions).toContainEqual({ type: 'BOOK_SPECIALIST', specialist: 'sports_doctor', deadline: TODAY, beforeMatch: false });
  });

  it('HEAD_IMPACT: out for the day, doctor by tomorrow, school before sport', () => {
    const r = triageCheckIn(dto({ signs: ['head_impact'] }));
    expect(r.outcome).toBe('HEAD_IMPACT');
    expect(r.loadBlocked).toBe(true);
    expect(r.actions).toContainEqual({ type: 'NOTIFY', audience: ['coach', 'parent'], urgency: 'immediate' });
    expect(r.actions).toContainEqual({ type: 'BOOK_SPECIALIST', specialist: 'doctor', deadline: '2026-10-02', beforeMatch: null });
    expect(r.actions).toContainEqual({ type: 'RETURN_TO_LEARN_FIRST' });
  });

  it('EMERGENCY wins over everything and puts 112 first', () => {
    const r = triageCheckIn(dto({ painReported: true, signs: ['cannot_bear_weight', 'head_impact'] }));
    expect(r.outcome).toBe('EMERGENCY');
    expect(r.actions[0]).toEqual({ type: 'CALL_EMERGENCY', phone: '112' });
    expect(r.flags.map((f) => f.redFlagType)).toEqual(['cannot_bear_weight', 'head_impact', 'pain']);
    expect(r.reasonCodes).toEqual(['EMERGENCY_SIGN', 'HEAD_IMPACT', 'PAIN_REPORTED']);
  });
});

describe('triageCheckIn — safety rules around the tree', () => {
  it('adds a yellow overuse flag on the 3rd pain report in the same place within 14 days', () => {
    const recentPain = [
      { date: '2026-09-25', location: 'Knee' },
      { date: '2026-09-29', location: 'knee ' },
      { date: '2026-09-10', location: 'knee' }, // outside the window
      { date: '2026-09-30', location: 'ankle' }, // another place
    ];
    const r = triageCheckIn(dto({ painReported: true, painLocation: 'knee' }), ctx({ recentPain }));
    expect(r.flags).toContainEqual({ studentId: 's1', flagLevel: 'yellow', redFlagType: 'overuse_pattern', source: 'check_in', location: 'knee' });
    expect(r.reasonCodes).toContain('OVERUSE_PATTERN');
  });

  it('does not claim a pattern for an unnamed place or only two reports', () => {
    const recentPain = [{ date: '2026-09-29', location: 'knee' }];
    expect(triageCheckIn(dto({ painReported: true, painLocation: 'knee' }), ctx({ recentPain })).reasonCodes).not.toContain('OVERUSE_PATTERN');
    const unnamed = [{ date: '2026-09-28', location: null }, { date: '2026-09-29', location: null }];
    expect(triageCheckIn(dto({ painReported: true }), ctx({ recentPain: unnamed })).reasonCodes).not.toContain('OVERUSE_PATTERN');
  });

  it('an uncleared red flag keeps the load blocked even if today looks fine', () => {
    const r = triageCheckIn(dto(), ctx({ hasOpenRedFlag: true, readinessColor: 'green' }));
    expect(r.outcome).toBe('CLEAR');
    expect(r.loadBlocked).toBe(true);
    expect(r.statusColor).toBe('red');
    expect(r.reasonCodes).toEqual(['AWAITING_DOCTOR_CLEARANCE']);
  });

  it('a re-submitted check-in does not duplicate today\'s open flags', () => {
    const r = triageCheckIn(dto({ painReported: true }), ctx({ hasOpenRedFlag: true, openFlagTypesToday: ['pain'] }));
    expect(r.flags).toEqual([]);
    expect(r.loadBlocked).toBe(true);
  });

  it('never uses diagnostic words', () => {
    const r = triageCheckIn(dto({ painReported: true, painLocation: 'knee', signs: ['head_impact', 'visible_deformity'] }));
    const text = JSON.stringify(r).toLowerCase();
    for (const word of ['fracture', 'sprain', 'concussion', 'rupture', 'tear', 'diagnos']) {
      expect(text.includes(word)).toBe(false);
    }
  });
});

describe('TriageSafetyGuard.processCheckIn', () => {
  function memoryStore(context: TriageContext) {
    const log: string[] = [];
    const statuses: DailyStatusWrite[] = [];
    const flags: NewSafetyFlag[] = [];
    const store: SafetyStore = {
      getContext: async () => context,
      saveDailyStatus: async (w) => {
        log.push('status');
        statuses.push(w);
      },
      insertFlags: async (f) => {
        log.push('flags');
        flags.push(...f);
      },
      saveCheckIn: async () => {
        log.push('answers');
      },
    };
    return { store, log, statuses, flags };
  }

  it('writes the block before the answers (fail-safe order)', async () => {
    const m = memoryStore(EMPTY_CONTEXT);
    const res = await new TriageSafetyGuard(m.store).processCheckIn(dto({ painReported: true, painLocation: 'knee' }));
    expect(res.ok).toBe(true);
    expect(m.log).toEqual(['status', 'flags', 'answers']);
    expect(m.statuses[0]).toEqual({
      studentId: 's1',
      statusDate: TODAY,
      color: 'red',
      loadBlocked: true,
      reasonCodes: ['PAIN_REPORTED'],
    });
    expect(m.flags.length).toBe(1);
  });

  it('writes nothing when the check-in is invalid', async () => {
    const m = memoryStore(EMPTY_CONTEXT);
    const res = await new TriageSafetyGuard(m.store).processCheckIn(dto({ stress: 9 }));
    expect(res.ok).toBe(false);
    expect(m.log).toEqual([]);
  });

  it('leaves the daily colour to the readiness engine when safety is clear and no colour is known', async () => {
    const m = memoryStore(EMPTY_CONTEXT);
    await new TriageSafetyGuard(m.store).processCheckIn(dto());
    expect(m.log).toEqual(['answers']);
  });
});
