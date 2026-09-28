// adp/src/types/adp.ts
//
// Domain types for the Athlete Digital Passport. They mirror the tables in
// adp/db/migrations/001_init_adp_schema.sql (snake_case there, camelCase
// here). Every enum is a `const` array first, so the same list drives both
// the TypeScript type and runtime validation, and cannot drift apart.
//
// Dates are ISO calendar days ('YYYY-MM-DD', UTC); timestamps are ISO
// strings. Nothing here imports from the CloudPulse site code.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const USER_ROLES = ['student', 'parent', 'teacher', 'coach', 'doctor', 'scout'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STATUS_COLORS = ['green', 'yellow', 'red'] as const;
export type StatusColor = (typeof STATUS_COLORS)[number];

export const SCALE_TYPES = ['lv10', 'ib7', 'gpa4'] as const;
export type ScaleType = (typeof SCALE_TYPES)[number];

export const RECORD_SOURCES = ['student', 'school'] as const;
/** 'school' = entered by a teacher or imported (verified); 'student' = self-reported. */
export type RecordSource = (typeof RECORD_SOURCES)[number];

export const RESCHEDULE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RescheduleStatus = (typeof RESCHEDULE_STATUSES)[number];

export const RESCHEDULE_REASONS = ['competition', 'travel', 'medical'] as const;
export type RescheduleReason = (typeof RESCHEDULE_REASONS)[number];

export const FLAG_LEVELS = ['red', 'yellow'] as const;
export type FlagLevel = (typeof FLAG_LEVELS)[number];

export const FLAG_SOURCES = ['check_in', 'coach_report'] as const;
export type FlagSource = (typeof FLAG_SOURCES)[number];

/**
 * Observed signs, never diagnoses (PRD 3.1, EU MDR). Each is something a
 * teenager or coach can see or feel, e.g. "can't put weight on the foot" —
 * not what it might mean medically.
 */
export const RED_FLAG_TYPES = [
  'pain',
  'head_impact',
  'loss_of_consciousness',
  'seizure',
  'confusion',
  'cannot_bear_weight',
  'visible_deformity',
  'numbness_or_tingling',
  'chest_pain_or_breathlessness',
  'overuse_pattern',
] as const;
export type RedFlagType = (typeof RED_FLAG_TYPES)[number];

/** Signs that mean "call 112 now". The first question of the triage tree. */
export const EMERGENCY_SIGNS = [
  'loss_of_consciousness',
  'seizure',
  'confusion',
  'cannot_bear_weight',
  'visible_deformity',
  'numbness_or_tingling',
  'chest_pain_or_breathlessness',
] as const satisfies readonly RedFlagType[];
export type EmergencySign = (typeof EMERGENCY_SIGNS)[number];

/** Signs an athlete can tick in a check-in (pain has its own field; overuse is derived). */
export const REPORTABLE_SIGNS = [...EMERGENCY_SIGNS, 'head_impact'] as const satisfies readonly RedFlagType[];
export type ReportableSign = (typeof REPORTABLE_SIGNS)[number];

export const ELIGIBILITY_REASON_CODES = [
  'OK',
  'NEAR_THRESHOLD',
  'PROJECTED_BELOW',
  'BELOW_THRESHOLD',
  'NO_DATA',
] as const;
export type EligibilityReasonCode = (typeof ELIGIBILITY_REASON_CODES)[number];

// ---------------------------------------------------------------------------
// Small value types
// ---------------------------------------------------------------------------

/** 'YYYY-MM-DD', UTC calendar day. */
export type IsoDate = string;
/** Full ISO 8601 timestamp. */
export type IsoDateTime = string;
export type Uuid = string;

// ---------------------------------------------------------------------------
// Rows (one per table)
// ---------------------------------------------------------------------------

export type Profile = {
  id: Uuid;
  role: UserRole;
  displayName: string;
  /** Non-sensitive facts linked adults may see (sport, class). Never health or grades. */
  metadata: Readonly<Record<string, string | number | boolean | null>>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** A grade → level anchor: [grade on the scale, attainment level 0..1]. */
export type GradeAnchor = readonly [grade: number, level: number];

export type GradeScale = {
  scaleType: ScaleType;
  minGrade: number;
  maxGrade: number;
  step: number;
  passGrade: number;
  /** Strictly increasing grades, non-decreasing levels, first/last on min/max. */
  anchors: readonly GradeAnchor[];
  version: number;
  approvedBy: string;
};

export type GradeScaleMap = Readonly<Record<ScaleType, GradeScale>>;

export type AcademicRecord = {
  id: Uuid;
  studentId: Uuid;
  subject: string;
  originalGrade: number;
  scaleType: ScaleType;
  /** Computed by the database from grade_scales; 0..1. */
  normalizedScore: number;
  weight: number;
  assessedOn: IsoDate;
  source: RecordSource;
  createdBy: Uuid | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type EligibilityStatus = {
  id: Uuid;
  studentId: Uuid;
  /** null only together with reasonCode 'NO_DATA' — never an invented green. */
  statusColor: StatusColor | null;
  reasonCode: EligibilityReasonCode;
  /** A worse status reaches the coach 48 h after the student (PRD 3.3). */
  coachVisibleFrom: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type RescheduleRequest = {
  id: Uuid;
  studentId: Uuid;
  teacherId: Uuid;
  subject: string;
  /** The assessment the student asks to move. */
  eventDate: IsoDate;
  reason: RescheduleReason;
  /** Always null when reason is 'medical' — teachers get no health details. */
  reasonNote: string | null;
  proposedDates: readonly IsoDate[];
  status: RescheduleStatus;
  /** Set when approved: one of proposedDates, tapped by the teacher. */
  approvedDate: IsoDate | null;
  decidedBy: Uuid | null;
  decidedAt: IsoDateTime | null;
  decisionNote: string | null;
  /** null = created by the server's conflict detector. */
  createdBy: Uuid | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type SafetyFlag = {
  id: Uuid;
  studentId: Uuid;
  flagLevel: FlagLevel;
  redFlagType: RedFlagType;
  source: FlagSource;
  reportedBy: Uuid | null;
  /** Body area in the athlete's own words ("knee"), not a diagnosis. */
  location: string | null;
  clearedByDoctor: boolean;
  clearedBy: Uuid | null;
  clearedAt: IsoDateTime | null;
  clearanceNote: string | null;
  createdAt: IsoDateTime;
};

export type CheckIn = {
  id: Uuid;
  studentId: Uuid;
  checkInDate: IsoDate;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  soreness: number;
  painReported: boolean;
  painLocation: string | null;
  redFlagSigns: readonly RedFlagType[];
  createdAt: IsoDateTime;
};

export type DailyStatus = {
  studentId: Uuid;
  statusDate: IsoDate;
  color: StatusColor;
  /** true ⇒ color is 'red' (enforced by the database). */
  loadBlocked: boolean;
  reasonCodes: readonly string[];
  computedAt: IsoDateTime;
};

// ---------------------------------------------------------------------------
// Inputs (DTOs)
// ---------------------------------------------------------------------------

/** What the athlete submits. Scales are 1..7 like CloudPulse (7 = best). */
export type CheckInDto = {
  studentId: Uuid;
  /** Day the check-in was filled in (offline check-ins arrive later). */
  date: IsoDate;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  soreness: number;
  painReported: boolean;
  painLocation?: string;
  /** Emergency signs and head impact the athlete ticked. */
  signs: readonly ReportableSign[];
};

/** A new flag to store (the database fills id, timestamps, clearance). */
export type NewSafetyFlag = Pick<SafetyFlag, 'studentId' | 'flagLevel' | 'redFlagType' | 'source' | 'location'>;

/** What the database stores for daily_status (computedAt is filled by it). */
export type DailyStatusWrite = Omit<DailyStatus, 'computedAt'>;

/** What the server stores for eligibility (coachVisibleFrom is stamped by a trigger). */
export type EligibilityWrite = Pick<EligibilityStatus, 'studentId' | 'statusColor' | 'reasonCode'>;

// ---------------------------------------------------------------------------
// Result helper
// ---------------------------------------------------------------------------

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
