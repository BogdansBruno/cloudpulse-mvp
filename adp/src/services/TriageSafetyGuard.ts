// adp/src/services/TriageSafetyGuard.ts
//
// Safety Guard + triage for a daily check-in (PRD v0.1, section 3.1).
//
// This is NOT a diagnostic tool. It answers two questions only:
//   1. How urgently does an adult need to step in?
//   2. What kind of professional should the athlete book, and by when?
// It never names a condition, never estimates severity and never returns an
// athlete to full load: only a doctor can, by clearing the flag in the
// database (EU MDR: software that informs diagnosis/treatment decisions is a
// class IIa+ medical device — ADP stays on the logistics side of that line).
//
// The tree, first "yes" wins (same order as the PRD diagram):
//   Q1 emergency sign?        → EMERGENCY:  112 now, load blocked, coach + parent now
//   Q2 head impact?           → HEAD_IMPACT: out for the day, doctor by tomorrow,
//                                back to school before back to sport (Amsterdam 2022)
//   Q3 pain?                  → PAIN: load blocked, sports doctor within
//                                min(48 h, 2 days before the next match)
//   otherwise                 → CLEAR: colour comes from the readiness engine
// Plus, independent of the branch:
//   - pain in the same place 3+ times in 14 days adds a yellow "overuse
//     pattern" flag (information for the coach and doctor);
//   - an earlier red flag no doctor has cleared keeps the load blocked, so a
//     second, "everything is fine" check-in cannot unblock an athlete.
//
// Every threshold and deadline here is a PRD draft to be signed off by the
// club's doctor before the pilot (PRD 3.1).

import {
  EMERGENCY_SIGNS,
  REPORTABLE_SIGNS,
  type CheckInDto,
  type DailyStatusWrite,
  type EmergencySign,
  type IsoDate,
  type NewSafetyFlag,
  type RedFlagType,
  type ReportableSign,
  type Result,
  type StatusColor,
  type Uuid,
} from '../types/adp';
import { addDays, daysBetween, isIsoDate, minDate } from './isoDate';

// ---------------------------------------------------------------------------
// Tunables (club doctor signs these off)
// ---------------------------------------------------------------------------

export const TRIAGE_RULES = {
  /** Sports-doctor appointment for pain: at most this many days away... */
  painBookingDays: 2,
  /** ...and no later than this many days before the next match. */
  daysBeforeMatch: 2,
  /** Doctor after a head impact: by the end of the next day. */
  headImpactBookingDays: 1,
  /** Overuse pattern: this many pain reports in the same place... */
  overuseCount: 3,
  /** ...within this many days, today included. */
  overuseWindowDays: 14,
  /** Follow-up questions on day +1 and +3 after a pain report (Return-to-Play). */
  followUpDays: [1, 3],
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TriageOutcome = 'EMERGENCY' | 'HEAD_IMPACT' | 'PAIN' | 'CLEAR';

export type TriageReasonCode =
  | 'EMERGENCY_SIGN'
  | 'HEAD_IMPACT'
  | 'PAIN_REPORTED'
  | 'OVERUSE_PATTERN'
  | 'AWAITING_DOCTOR_CLEARANCE';

/** Kinds of professional, never a diagnosis. */
export type Specialist = 'emergency_services' | 'doctor' | 'sports_doctor';

export type NotifyAudience = 'coach' | 'parent';

export type TriageAction =
  | { type: 'CALL_EMERGENCY'; phone: '112' }
  | { type: 'BLOCK_LOAD' }
  | { type: 'ISSUE_SAFETY_PASS' }
  | { type: 'NOTIFY'; audience: readonly NotifyAudience[]; urgency: 'immediate' | 'same_day' }
  | {
      type: 'BOOK_SPECIALIST';
      specialist: Specialist;
      /** Book by this day. Logistics only — not a promise to be fit by the match. */
      deadline: IsoDate;
      /** true: can happen ≥ 2 days before the match; false: cannot; null: no match planned. */
      beforeMatch: boolean | null;
    }
  | { type: 'RETURN_TO_LEARN_FIRST' }
  | { type: 'FOLLOW_UP'; onDates: readonly IsoDate[] };

/** What the server knows beyond the answers themselves. */
export type TriageContext = {
  nextMatchDate: IsoDate | null;
  /** Pain reports before this check-in (any window; the rule filters to 14 days). */
  recentPain: readonly { date: IsoDate; location: string | null }[];
  /** Any red flag, from any day, not yet cleared by a doctor. */
  hasOpenRedFlag: boolean;
  /** Flag types already open for this athlete today (re-submission must not duplicate them). */
  openFlagTypesToday: readonly RedFlagType[];
  /** Colour from the readiness engine when safety is clear; null = not computed. */
  readinessColor: StatusColor | null;
};

export const EMPTY_CONTEXT: TriageContext = {
  nextMatchDate: null,
  recentPain: [],
  hasOpenRedFlag: false,
  openFlagTypesToday: [],
  readinessColor: null,
};

export type TriageResult = {
  outcome: TriageOutcome;
  /** 'red' whenever load is blocked; otherwise the readiness colour (may be null = no data). */
  statusColor: StatusColor | null;
  loadBlocked: boolean;
  reasonCodes: readonly TriageReasonCode[];
  /** New flags to store (already de-duplicated against today's open flags). */
  flags: readonly NewSafetyFlag[];
  /** In order of priority: the first one is what the athlete sees first. */
  actions: readonly TriageAction[];
};

export type CheckInValidationError =
  | { code: 'MISSING_STUDENT' }
  | { code: 'INVALID_DATE' }
  | { code: 'SCALE_OUT_OF_RANGE'; field: 'sleepQuality' | 'stress' | 'fatigue' | 'soreness' }
  | { code: 'PAIN_LOCATION_WITHOUT_PAIN' }
  | { code: 'PAIN_LOCATION_TOO_LONG' }
  | { code: 'UNKNOWN_SIGN'; sign: string };

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SCALE_FIELDS = ['sleepQuality', 'stress', 'fatigue', 'soreness'] as const;
const PAIN_LOCATION_MAX = 60;

const isReportable = (s: string): s is ReportableSign => (REPORTABLE_SIGNS as readonly string[]).includes(s);
const isEmergency = (s: RedFlagType): s is EmergencySign => (EMERGENCY_SIGNS as readonly string[]).includes(s);

/** Same limits as the adp.check_ins constraints, checked before anything is written. */
export function validateCheckIn(dto: CheckInDto): CheckInValidationError[] {
  const errors: CheckInValidationError[] = [];
  if (!dto.studentId) errors.push({ code: 'MISSING_STUDENT' });
  if (!isIsoDate(dto.date)) errors.push({ code: 'INVALID_DATE' });
  for (const field of SCALE_FIELDS) {
    const v = dto[field];
    if (!Number.isInteger(v) || v < 1 || v > 7) errors.push({ code: 'SCALE_OUT_OF_RANGE', field });
  }
  const location = dto.painLocation?.trim() ?? '';
  if (location && !dto.painReported) errors.push({ code: 'PAIN_LOCATION_WITHOUT_PAIN' });
  if (location.length > PAIN_LOCATION_MAX) errors.push({ code: 'PAIN_LOCATION_TOO_LONG' });
  for (const sign of dto.signs as readonly string[]) {
    if (!isReportable(sign)) errors.push({ code: 'UNKNOWN_SIGN', sign });
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Triage (pure)
// ---------------------------------------------------------------------------

/** "Knee ", "knee" and "KNEE" are one place; an unnamed place matches nothing. */
function samePlace(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (s: string | null | undefined) => (s ?? '').trim().toLocaleLowerCase();
  return norm(a) !== '' && norm(a) === norm(b);
}

function painBooking(today: IsoDate, nextMatch: IsoDate | null): { deadline: IsoDate; beforeMatch: boolean | null } {
  const byWindow = addDays(today, TRIAGE_RULES.painBookingDays);
  if (nextMatch === null) return { deadline: byWindow, beforeMatch: null };
  const latestBeforeMatch = addDays(nextMatch, -TRIAGE_RULES.daysBeforeMatch);
  if (latestBeforeMatch < today) {
    // Too late to be seen 2 days before the match. Book as soon as possible;
    // the roster then shows "not selected until examined" — never a shortcut.
    return { deadline: today, beforeMatch: false };
  }
  return { deadline: minDate(byWindow, latestBeforeMatch), beforeMatch: true };
}

/**
 * Pure decision: answers + context → outcome, flags, actions. No I/O, no
 * clock (the check-in's own date is "today"), so every case is testable.
 */
export function triageCheckIn(dto: CheckInDto, ctx: TriageContext = EMPTY_CONTEXT): TriageResult {
  const today = dto.date;
  const signs = [...new Set(dto.signs)];
  const emergencySigns = signs.filter(isEmergency);
  const headImpact = signs.includes('head_impact');
  const location = dto.painReported ? dto.painLocation?.trim() || null : null;

  // ---- flags: one per observed sign, whatever branch wins ----
  const flags: NewSafetyFlag[] = [];
  const addFlag = (type: RedFlagType, level: 'red' | 'yellow', where: string | null) =>
    flags.push({ studentId: dto.studentId, flagLevel: level, redFlagType: type, source: 'check_in', location: where });

  for (const s of emergencySigns) addFlag(s, 'red', null);
  if (headImpact) addFlag('head_impact', 'red', null);
  if (dto.painReported) addFlag('pain', 'red', location);

  let overuse = false;
  if (dto.painReported && location) {
    const windowStart = addDays(today, -(TRIAGE_RULES.overuseWindowDays - 1));
    const earlier = ctx.recentPain.filter(
      (p) => p.date >= windowStart && p.date < today && samePlace(p.location, location)
    ).length;
    overuse = earlier + 1 >= TRIAGE_RULES.overuseCount;
    if (overuse) addFlag('overuse_pattern', 'yellow', location);
  }

  // ---- outcome: first "yes" of the tree ----
  const outcome: TriageOutcome =
    emergencySigns.length > 0 ? 'EMERGENCY' : headImpact ? 'HEAD_IMPACT' : dto.painReported ? 'PAIN' : 'CLEAR';

  const reasonCodes: TriageReasonCode[] = [];
  if (emergencySigns.length > 0) reasonCodes.push('EMERGENCY_SIGN');
  if (headImpact) reasonCodes.push('HEAD_IMPACT');
  if (dto.painReported) reasonCodes.push('PAIN_REPORTED');
  if (overuse) reasonCodes.push('OVERUSE_PATTERN');

  const actions: TriageAction[] = [];
  switch (outcome) {
    case 'EMERGENCY':
      actions.push(
        { type: 'CALL_EMERGENCY', phone: '112' },
        { type: 'BLOCK_LOAD' },
        { type: 'NOTIFY', audience: ['coach', 'parent'], urgency: 'immediate' },
        { type: 'BOOK_SPECIALIST', specialist: 'emergency_services', deadline: today, beforeMatch: null },
        { type: 'ISSUE_SAFETY_PASS' }
      );
      break;
    case 'HEAD_IMPACT':
      actions.push(
        { type: 'BLOCK_LOAD' },
        { type: 'NOTIFY', audience: ['coach', 'parent'], urgency: 'immediate' },
        {
          type: 'BOOK_SPECIALIST',
          specialist: 'doctor',
          deadline: addDays(today, TRIAGE_RULES.headImpactBookingDays),
          beforeMatch: null,
        },
        { type: 'RETURN_TO_LEARN_FIRST' },
        { type: 'ISSUE_SAFETY_PASS' }
      );
      break;
    case 'PAIN': {
      const booking = painBooking(today, ctx.nextMatchDate);
      actions.push(
        { type: 'BLOCK_LOAD' },
        { type: 'NOTIFY', audience: ['coach', 'parent'], urgency: 'same_day' },
        { type: 'BOOK_SPECIALIST', specialist: 'sports_doctor', ...booking },
        { type: 'ISSUE_SAFETY_PASS' },
        { type: 'FOLLOW_UP', onDates: TRIAGE_RULES.followUpDays.map((d) => addDays(today, d)) }
      );
      break;
    }
    case 'CLEAR':
      break;
  }

  // ---- an uncleared red flag keeps the block, whatever today's answers say ----
  let loadBlocked = outcome !== 'CLEAR';
  if (!loadBlocked && ctx.hasOpenRedFlag) {
    loadBlocked = true;
    reasonCodes.push('AWAITING_DOCTOR_CLEARANCE');
    actions.push({ type: 'BLOCK_LOAD' }, { type: 'ISSUE_SAFETY_PASS' });
  }

  const alreadyOpen = new Set(ctx.openFlagTypesToday);
  return {
    outcome,
    statusColor: loadBlocked ? 'red' : ctx.readinessColor,
    loadBlocked,
    reasonCodes,
    flags: flags.filter((f) => !alreadyOpen.has(f.redFlagType)),
    actions,
  };
}

// ---------------------------------------------------------------------------
// Service (server side, service_role — the only writer of check-ins,
// daily status and check-in flags; see 001_init_adp_schema.sql)
// ---------------------------------------------------------------------------

export interface SafetyStore {
  getContext(studentId: Uuid, date: IsoDate): Promise<TriageContext>;
  saveDailyStatus(write: DailyStatusWrite): Promise<void>;
  insertFlags(flags: readonly NewSafetyFlag[]): Promise<void>;
  /** Upsert on (student_id, check_in_date). */
  saveCheckIn(dto: CheckInDto): Promise<void>;
}

export class TriageSafetyGuard {
  private readonly store: SafetyStore;

  constructor(store: SafetyStore) {
    this.store = store;
  }

  /**
   * Validates, triages and stores a check-in.
   *
   * Write order is fail-safe: the blocking status and the flags go in
   * BEFORE the raw answers. If a later write fails, the athlete is already
   * blocked; the opposite order could leave "pain" saved but load open.
   */
  async processCheckIn(answers: CheckInDto): Promise<Result<TriageResult, CheckInValidationError[]>> {
    const errors = validateCheckIn(answers);
    if (errors.length > 0) return { ok: false, error: errors };

    const ctx = await this.store.getContext(answers.studentId, answers.date);
    const result = triageCheckIn(answers, ctx);

    if (result.statusColor !== null) {
      await this.store.saveDailyStatus({
        studentId: answers.studentId,
        statusDate: answers.date,
        color: result.statusColor,
        loadBlocked: result.loadBlocked,
        reasonCodes: result.reasonCodes,
      });
    }
    if (result.flags.length > 0) await this.store.insertFlags(result.flags);
    await this.store.saveCheckIn(answers);

    return { ok: true, value: result };
  }
}

/** Days until the next match, for UI copy ("match in N days"); null without a match. */
export function daysToMatch(today: IsoDate, nextMatch: IsoDate | null): number | null {
  return nextMatch === null ? null : daysBetween(today, nextMatch);
}
