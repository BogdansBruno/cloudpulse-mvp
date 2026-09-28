// adp/src/services/AcademicEngine.ts
//
// Academic eligibility for match selection (PRD v0.1, sections 3.2–3.3).
//
// What it does:
//   1. Normalises every grade to a common attainment level a ∈ [0, 1] using
//      the school-approved anchors in adp.grade_scales (piecewise-linear).
//      `normalizeGrade` mirrors the SQL function adp.normalize_grade exactly.
//   2. Averages per subject (weighted), then across subjects.
//   3. Decides the colour with BOTH rules (team decision, 28.09):
//        red    — any subject below its pass level, OR the overall average
//                 below the policy threshold;
//        yellow — any subject, or the average, within `margin` above that line;
//        green  — otherwise;
//        none   — no verified grades at all ('NO_DATA', never an invented green).
//   4. For each failing or near subject, tells the student the minimum grade
//      on the next assessment that keeps/brings the subject to pass level —
//      "what do I need", not a prediction of what they will get.
//
// What it never does:
//   - count self-reported grades by default (PRD risk 1: only school-verified
//     grades feed a status other people see);
//   - expose averages or grades to the coach: only { color, reason code } is
//     persisted, and RLS shows the coach nothing else (001 migration);
//   - decide selection: the club and school set the threshold in their
//     agreement; this engine only applies it.

import type {
  AcademicRecord,
  EligibilityReasonCode,
  EligibilityWrite,
  GradeScale,
  GradeScaleMap,
  ScaleType,
  StatusColor,
  Uuid,
} from '../types/adp';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AcademicErrorCode = 'GRADE_OUT_OF_SCALE' | 'BAD_POLICY' | 'BAD_SCALE';

export class AcademicEngineError extends Error {
  readonly code: AcademicErrorCode;
  constructor(code: AcademicErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'AcademicEngineError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export type EligibilityPolicy = {
  /** Overall average level (0..1) below which the status is red. */
  averageThreshold: number;
  /** How far above a line (in levels) still counts as "near" → yellow. */
  margin: number;
  /** Count only school-verified grades. Keep true for anything others see. */
  verifiedOnly: boolean;
};

/**
 * PRD example values, to be replaced by the school–club agreement:
 * threshold 0.40 = the Latvian pass grade 4 under the example anchors.
 */
export const DEFAULT_ELIGIBILITY_POLICY: EligibilityPolicy = {
  averageThreshold: 0.4,
  margin: 0.1,
  verifiedOnly: true,
};

function assertPolicy(p: EligibilityPolicy): void {
  const inUnit = (x: number) => Number.isFinite(x) && x >= 0 && x <= 1;
  if (!inUnit(p.averageThreshold) || !inUnit(p.margin)) {
    throw new AcademicEngineError('BAD_POLICY', 'averageThreshold and margin must be within 0..1');
  }
}

// ---------------------------------------------------------------------------
// Normalisation (mirror of adp.normalize_grade)
// ---------------------------------------------------------------------------

const CENTS = 100;
const round4 = (x: number): number => Math.round(x * 10_000) / 10_000;

/** Grades are numeric(4,2) in the database: compare in hundredths, not floats. */
function isOnStep(scale: GradeScale, grade: number): boolean {
  const offset = Math.round((grade - scale.minGrade) * CENTS);
  const step = Math.round(scale.step * CENTS);
  return offset % step === 0;
}

export function isValidGrade(scale: GradeScale, grade: number): boolean {
  return (
    Number.isFinite(grade) && grade >= scale.minGrade && grade <= scale.maxGrade && isOnStep(scale, grade)
  );
}

/** Grade → attainment level 0..1. Throws GRADE_OUT_OF_SCALE like the SQL twin. */
export function normalizeGrade(scale: GradeScale, grade: number): number {
  if (!isValidGrade(scale, grade)) {
    throw new AcademicEngineError('GRADE_OUT_OF_SCALE', `${grade} is not a valid ${scale.scaleType} grade`);
  }
  const anchors = scale.anchors;
  if (anchors.length < 2) {
    throw new AcademicEngineError('BAD_SCALE', `${scale.scaleType} needs at least two anchors`);
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const [g0, a0] = anchors[i];
    const [g1, a1] = anchors[i + 1];
    if (grade <= g1) {
      return round4(a0 + ((a1 - a0) * (grade - g0)) / (g1 - g0));
    }
  }
  return round4(anchors[anchors.length - 1][1]);
}

/** Every grade that exists on the scale, lowest first (lv10: 10 values, gpa4: 401). */
function gradesOf(scale: GradeScale): number[] {
  const step = Math.round(scale.step * CENTS);
  const lo = Math.round(scale.minGrade * CENTS);
  const hi = Math.round(scale.maxGrade * CENTS);
  const out: number[] = [];
  for (let c = lo; c <= hi; c += step) out.push(c / CENTS);
  return out;
}

/** Lowest grade on the scale whose level is at least `level`, or null if none. */
export function lowestGradeReaching(scale: GradeScale, level: number): number | null {
  for (const g of gradesOf(scale)) {
    if (normalizeGrade(scale, g) >= level - 1e-9) return g;
  }
  return null;
}

export type ConvertedGrade = {
  /** Closest grade on the target scale. Shown with "≈": a guide, not an official conversion. */
  approx: number;
  /** The source grade covers half a step each way; this is that band on the target scale. */
  low: number;
  high: number;
};

/** Source grade → target scale via the common level (PRD 3.2: g_T = f_T⁻¹(f_S(g_S))). */
export function convertGrade(from: GradeScale, to: GradeScale, grade: number): ConvertedGrade {
  const nearest = (level: number): number => {
    let best = to.minGrade;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const g of gradesOf(to)) {
      const d = Math.abs(normalizeGrade(to, g) - level);
      if (d < bestDiff - 1e-12) {
        best = g;
        bestDiff = d;
      }
    }
    return best;
  };
  const level = normalizeGrade(from, grade);
  const half = from.step / 2;
  const levelAt = (g: number): number => {
    // Levels between grades: interpolate on the same anchors, clamped to the scale.
    const clamped = Math.min(from.maxGrade, Math.max(from.minGrade, g));
    for (let i = 0; i < from.anchors.length - 1; i++) {
      const [g0, a0] = from.anchors[i];
      const [g1, a1] = from.anchors[i + 1];
      if (clamped <= g1) return a0 + ((a1 - a0) * (clamped - g0)) / (g1 - g0);
    }
    return from.anchors[from.anchors.length - 1][1];
  };
  return { approx: nearest(level), low: nearest(levelAt(grade - half)), high: nearest(levelAt(grade + half)) };
}

// ---------------------------------------------------------------------------
// "What do I need on the next assessment?" (PRD 3.2 formula, in levels)
// ---------------------------------------------------------------------------

export type RequiredGrade =
  | { kind: 'already_secured' }
  | { kind: 'reachable'; grade: number; scaleType: ScaleType }
  | { kind: 'unreachable' };

type Weighted = { level: number; weight: number };

/**
 *   Z = (T · (Σw + W_next) − Σ w·a) / W_next
 * then the lowest real grade on `scale` whose level ≥ Z. If even the top
 * grade is not enough, the honest answer is "not by tests alone".
 */
export function requiredGrade(
  done: readonly Weighted[],
  targetLevel: number,
  scale: GradeScale,
  nextWeight = 1
): RequiredGrade {
  const sumW = done.reduce((s, d) => s + d.weight, 0);
  const sumWA = done.reduce((s, d) => s + d.weight * d.level, 0);
  const z = (targetLevel * (sumW + nextWeight) - sumWA) / nextWeight;
  if (z <= normalizeGrade(scale, scale.minGrade) + 1e-9) return { kind: 'already_secured' };
  const grade = lowestGradeReaching(scale, z);
  return grade === null ? { kind: 'unreachable' } : { kind: 'reachable', grade, scaleType: scale.scaleType };
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

export type SubjectState = 'failing' | 'near' | 'ok';

export type SubjectSummary = {
  subject: string;
  /** Weighted mean level of the counted grades. */
  averageLevel: number;
  /** Level of the pass grade on the scale of the latest grade. */
  passLevel: number;
  /** Scale of the latest grade — the one the next assessment will use. */
  scaleType: ScaleType;
  recordCount: number;
  state: SubjectState;
  /** Minimum on the next assessment to be at pass level; null when state is 'ok'. */
  nextNeeded: RequiredGrade | null;
};

export type EligibilityTrigger =
  | { kind: 'SUBJECT_BELOW_PASS'; subject: string }
  | { kind: 'SUBJECT_NEAR_PASS'; subject: string }
  | { kind: 'AVERAGE_BELOW_THRESHOLD' }
  | { kind: 'AVERAGE_NEAR_THRESHOLD' };

export type EligibilityResult = {
  /** null only with 'NO_DATA'. */
  statusColor: StatusColor | null;
  reasonCode: EligibilityReasonCode;
  /** Mean of subject averages (each subject counts once); null without data. */
  overallLevel: number | null;
  subjects: readonly SubjectSummary[];
  /** Why the colour is what it is, for the student's screen. */
  triggers: readonly EligibilityTrigger[];
  countedRecords: number;
  /** Self-reported grades left out of the status (shown to the student only). */
  ignoredSelfReported: number;
};

/** Pure core: same records + scales + policy → same result. No I/O. */
export function evaluateEligibility(
  records: readonly AcademicRecord[],
  scales: GradeScaleMap,
  policy: EligibilityPolicy = DEFAULT_ELIGIBILITY_POLICY
): EligibilityResult {
  assertPolicy(policy);

  const counted = policy.verifiedOnly ? records.filter((r) => r.source === 'school') : [...records];
  const ignoredSelfReported = records.length - counted.length;

  if (counted.length === 0) {
    return {
      statusColor: null,
      reasonCode: 'NO_DATA',
      overallLevel: null,
      subjects: [],
      triggers: [],
      countedRecords: 0,
      ignoredSelfReported,
    };
  }

  // Group by subject (trimmed, case-insensitive: "Fizika" and "fizika " are one subject).
  const bySubject = new Map<string, AcademicRecord[]>();
  for (const r of counted) {
    const key = r.subject.trim().toLocaleLowerCase();
    const list = bySubject.get(key);
    if (list) list.push(r);
    else bySubject.set(key, [r]);
  }

  const subjects: SubjectSummary[] = [];
  const triggers: EligibilityTrigger[] = [];

  for (const list of bySubject.values()) {
    const sorted = [...list].sort((a, b) => a.assessedOn.localeCompare(b.assessedOn));
    const latest = sorted[sorted.length - 1];
    const scale = scales[latest.scaleType];
    const weighted: Weighted[] = sorted.map((r) => ({
      // Recomputed from the current anchors rather than trusting the stored
      // value, so a re-approved scale applies to old grades too.
      level: normalizeGrade(scales[r.scaleType], r.originalGrade),
      weight: r.weight,
    }));
    const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
    const averageLevel = round4(weighted.reduce((s, w) => s + w.level * w.weight, 0) / totalWeight);
    const passLevel = normalizeGrade(scale, scale.passGrade);

    const state: SubjectState =
      averageLevel < passLevel ? 'failing' : averageLevel < passLevel + policy.margin ? 'near' : 'ok';
    const name = latest.subject.trim();
    if (state === 'failing') triggers.push({ kind: 'SUBJECT_BELOW_PASS', subject: name });
    if (state === 'near') triggers.push({ kind: 'SUBJECT_NEAR_PASS', subject: name });

    subjects.push({
      subject: name,
      averageLevel,
      passLevel,
      scaleType: scale.scaleType,
      recordCount: sorted.length,
      state,
      nextNeeded: state === 'ok' ? null : requiredGrade(weighted, passLevel, scale),
    });
  }

  subjects.sort((a, b) => a.averageLevel - b.averageLevel || a.subject.localeCompare(b.subject));

  const overallLevel = round4(subjects.reduce((s, x) => s + x.averageLevel, 0) / subjects.length);
  if (overallLevel < policy.averageThreshold) triggers.push({ kind: 'AVERAGE_BELOW_THRESHOLD' });
  else if (overallLevel < policy.averageThreshold + policy.margin) triggers.push({ kind: 'AVERAGE_NEAR_THRESHOLD' });

  const red = triggers.some((t) => t.kind === 'SUBJECT_BELOW_PASS' || t.kind === 'AVERAGE_BELOW_THRESHOLD');
  const yellow = triggers.length > 0;

  return {
    statusColor: red ? 'red' : yellow ? 'yellow' : 'green',
    reasonCode: red ? 'BELOW_THRESHOLD' : yellow ? 'NEAR_THRESHOLD' : 'OK',
    overallLevel,
    subjects,
    triggers,
    countedRecords: counted.length,
    ignoredSelfReported,
  };
}

// ---------------------------------------------------------------------------
// Service (runs on the server with service_role; the only writer of
// adp.eligibility_statuses)
// ---------------------------------------------------------------------------

export interface AcademicRepository {
  /** The student's grades for the current assessment period. */
  getRecords(studentId: Uuid): Promise<readonly AcademicRecord[]>;
  getScales(): Promise<GradeScaleMap>;
  /** Upsert by student_id. The database stamps coach_visible_from (48 h rule). */
  saveEligibility(write: EligibilityWrite): Promise<void>;
}

export class AcademicEngine {
  private readonly repo: AcademicRepository;
  private readonly policy: EligibilityPolicy;

  constructor(repo: AcademicRepository, policy: EligibilityPolicy = DEFAULT_ELIGIBILITY_POLICY) {
    assertPolicy(policy);
    this.repo = repo;
    this.policy = policy;
  }

  /**
   * Recomputes and stores the student's eligibility colour. Returns the full
   * result for the student's own screen; only colour + reason code are saved.
   */
  async calculateEligibilityStatus(studentId: Uuid): Promise<EligibilityResult> {
    const [records, scales] = await Promise.all([this.repo.getRecords(studentId), this.repo.getScales()]);
    // Defence in depth: a repository bug must not mix another student's grades in.
    const own = records.filter((r) => r.studentId === studentId);
    const result = evaluateEligibility(own, scales, this.policy);
    await this.repo.saveEligibility({ studentId, statusColor: result.statusColor, reasonCode: result.reasonCode });
    return result;
  }
}
