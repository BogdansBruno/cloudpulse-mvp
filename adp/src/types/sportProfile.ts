// adp/src/types/sportProfile.ts
//
// Sport-Aware AI Coach & Rehab Engine — step 1: types and data structures.
//
// Same conventions as types/adp.ts: every enum is a `const` array first, so
// one list drives both the TypeScript type and runtime validation; values are
// snake_case, exactly as they will be stored in the database.
//
// EU MDR boundary (read before extending anything here):
//   - Nothing in this file describes a diagnosis or a treatment. A
//     "soreness zone" is where the athlete FEELS muscle tightness or tiredness,
//     in their own judgement. Pain is not soreness: pain goes through the
//     existing pain field of the check-in and TriageSafetyGuard, which blocks
//     load and books a specialist. The coach module never sees it as a drill
//     target.
//   - Joints (knee, ankle, wrist, elbow, hip joint) are deliberately NOT
//     selectable zones: "it hurts in the knee" is a triage question, not a
//     mobility question.
//   - "Engine decides, AI explains": EngineLimits (below) is the ceiling the
//     readiness engine sets. The AI may only fill a plan inside it.
//
// Every number below is a product draft for the club doctor / S&C coach to
// approve, like TRIAGE_RULES — not a medical claim.

import type { IsoDate, IsoDateTime, Result, Uuid } from './adp';

// ---------------------------------------------------------------------------
// Sport and season
// ---------------------------------------------------------------------------

export const SPORT_TYPES = ['football', 'basketball', 'swimming', 'tennis', 'athletics', 'other'] as const;
export type SportType = (typeof SPORT_TYPES)[number];

/**
 * Where the team is in its year. 'recovery' is the planned rest block after a
 * season (transition / deload) — NOT the state after a pain report; that is
 * Return-to-Play and comes from the engine (EngineLimits.rtp).
 */
export const SEASON_PHASES = ['pre_season', 'in_season', 'off_season', 'recovery'] as const;
export type SeasonPhase = (typeof SEASON_PHASES)[number];

/**
 * What the coach module knows about the athlete's sport context.
 * DB (002_sport_profile.sql): sportType = adp.profiles.sport_type (set by the
 * student); the phase comes from adp.season_phase_of() — set by the COACH for
 * the whole team; with several coaches the most recently set phase applies.
 * null = not set yet: the module then plans without periodisation.
 */
export type SportProfile = {
  studentId: Uuid;
  sportType: SportType | null;
  seasonPhase: SeasonPhase | null;
  /** The coach who set the phase. */
  phaseSetBy: Uuid | null;
  /** When the phase was last changed (stamped by the database; phases are set, never inferred). */
  phaseUpdatedAt: IsoDateTime | null;
};

// ---------------------------------------------------------------------------
// Body zones — the 2D silhouette (idea A, "Biomechanical Soreness Mapping")
// ---------------------------------------------------------------------------

/** Muscle regions only. No joints — see the header. */
export const BODY_ZONES = [
  // front view
  'chest',
  'shoulder_front',
  'biceps',
  'forearm',
  'abdominals',
  'obliques',
  'hip_flexors',
  'adductors',
  'quadriceps',
  'shins',
  // back view
  'neck_upper_traps',
  'shoulder_back',
  'upper_back',
  'lower_back',
  'triceps',
  'glutes',
  'hamstrings',
  'calves',
] as const;
export type BodyZone = (typeof BODY_ZONES)[number];

export const SILHOUETTE_VIEWS = ['front', 'back'] as const;
export type SilhouetteView = (typeof SILHOUETTE_VIEWS)[number];

/** Which side of the silhouette each zone is drawn on (forearm appears on both; front wins). */
export const ZONE_VIEW: Readonly<Record<BodyZone, SilhouetteView>> = {
  chest: 'front',
  shoulder_front: 'front',
  biceps: 'front',
  forearm: 'front',
  abdominals: 'front',
  obliques: 'front',
  hip_flexors: 'front',
  adductors: 'front',
  quadriceps: 'front',
  shins: 'front',
  neck_upper_traps: 'back',
  shoulder_back: 'back',
  upper_back: 'back',
  lower_back: 'back',
  triceps: 'back',
  glutes: 'back',
  hamstrings: 'back',
  calves: 'back',
};

/** Zones with one on each side of the body; the rest are central. */
export const PAIRED_ZONES: ReadonlySet<BodyZone> = new Set<BodyZone>([
  'shoulder_front',
  'biceps',
  'forearm',
  'obliques',
  'hip_flexors',
  'adductors',
  'quadriceps',
  'shins',
  'shoulder_back',
  'triceps',
  'glutes',
  'hamstrings',
  'calves',
]);

/**
 * Zones where "tightness" in a teenager is worth a professional look sooner:
 * lower back, neck and shins. Here the module suggests only gentle mobility,
 * and from CAUTIOUS_ZONE_REFER_FROM up it suggests no drills at all — just
 * "tell your coach; if it does not ease, a doctor, school nurse or physio".
 * This is conservative routing, not a diagnosis.
 */
export const CAUTIOUS_ZONES: ReadonlySet<BodyZone> = new Set<BodyZone>(['lower_back', 'neck_upper_traps', 'shins']);

export const SIDES = ['left', 'right', 'both', 'center'] as const;
export type Side = (typeof SIDES)[number];

/**
 * 1 = barely notice it … 5 = so tight it limits movement.
 * The athlete's own rating; the UI shows a word next to each number.
 */
export const SORENESS_SEVERITIES = [1, 2, 3, 4, 5] as const;
export type SorenessSeverity = (typeof SORENESS_SEVERITIES)[number];

/** One tap on the silhouette. */
export type SorenessZone = {
  zoneId: BodyZone;
  side: Side;
  severity: SorenessSeverity;
};

export const SORENESS_RULES = {
  /** At most this many zones per check-in — beyond that it is general fatigue, the engine's job. */
  maxZones: 6,
  /** Self-care drills up to this severity; above it the zone gets no drills, only a referral line. */
  selfCareMaxSeverity: 4,
  /** For CAUTIOUS_ZONES the referral starts earlier. */
  cautiousZoneReferFrom: 3,
} as const;

// ---------------------------------------------------------------------------
// Sport focus — where prehab usually concentrates (drafts for S&C approval)
// ---------------------------------------------------------------------------

/**
 * Common load areas per sport, used to pick prehab blocks even when nothing
 * is sore (e.g. football → hamstrings and groin; swimming → shoulders).
 * Emphasis, not prediction: no risk numbers are attached to it.
 */
export const SPORT_FOCUS_ZONES: Readonly<Record<SportType, readonly BodyZone[]>> = {
  football: ['hamstrings', 'adductors', 'hip_flexors', 'calves'],
  basketball: ['calves', 'quadriceps', 'glutes'],
  swimming: ['shoulder_back', 'shoulder_front', 'upper_back', 'neck_upper_traps'],
  tennis: ['forearm', 'shoulder_back', 'obliques', 'calves'],
  athletics: ['hamstrings', 'calves', 'hip_flexors', 'glutes'],
  other: [],
};

// ---------------------------------------------------------------------------
// Engine limits — the ceiling the AI must stay under (idea C input)
// ---------------------------------------------------------------------------

/**
 * The engine's verdict for today, strictest last:
 *   green   — normal session allowed;
 *   yellow  — reduced session;
 *   red     — recovery only (mobility, breathing, easy movement);
 *   blocked — no training blocks at all (pain, red flag, match-day block).
 */
export const LOAD_CEILINGS = ['green', 'yellow', 'red', 'blocked'] as const;
export type LoadCeiling = (typeof LOAD_CEILINGS)[number];

/** Kinds of work a plan may contain. Nothing here is treatment. */
export const BLOCK_KINDS = [
  'mobility',
  'activation',
  'isometric',
  'eccentric',
  'bodyweight_strength',
  'aerobic_base',
  'breathing_recovery',
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export type CeilingRule = {
  /** Upper bound for the whole plan, minutes. 0 = no plan. */
  maxMinutes: number;
  /** Upper bound for perceived effort (CR-10 RPE) of any block. */
  maxRpe: number;
  allowedKinds: readonly BlockKind[];
};

export const CEILING_RULES: Readonly<Record<LoadCeiling, CeilingRule>> = {
  green: {
    maxMinutes: 60,
    maxRpe: 8,
    allowedKinds: BLOCK_KINDS,
  },
  yellow: {
    maxMinutes: 35,
    maxRpe: 5,
    allowedKinds: ['mobility', 'activation', 'isometric', 'bodyweight_strength', 'aerobic_base', 'breathing_recovery'],
  },
  red: {
    maxMinutes: 15,
    maxRpe: 3,
    allowedKinds: ['mobility', 'breathing_recovery'],
  },
  blocked: {
    maxMinutes: 0,
    maxRpe: 0,
    allowedKinds: [],
  },
};

/** Idea B, "Micro-Dose Workouts": on exam-storm days a short session replaces the full one. */
export const MICRO_DOSE = {
  minutes: 12,
  maxRpe: 5,
} as const;

/** Return-to-Play state as the CloudPulse engine reports it. */
export const RTP_STATES = ['none', 'restricted', 'ready', 'cleared'] as const;
export type RtpState = (typeof RTP_STATES)[number];

export type EngineLimits = {
  date: IsoDate;
  ceiling: LoadCeiling;
  /** Engine outputs, passed through for the explanation only — the AI never recomputes them. */
  readinessScore: number | null;
  acwr: number | null;
  hooperIndex: number | null;
  /** Machine-readable reasons (e.g. 'PAIN_REPORTED', 'ACWR_SPIKE', 'MATCH_DAY'). */
  reasonCodes: readonly string[];
  /** The athlete is in the exam window of a team exam storm (lib/exam-storm.ts). */
  examStorm: boolean;
  rtp: { state: RtpState; clearedOn: IsoDate | null };
};

// ---------------------------------------------------------------------------
// Plan shape — what the AI must return (validated before anyone sees it)
// ---------------------------------------------------------------------------

export const PLAN_MODES = ['full', 'micro_dose', 'recovery_only', 'rtp_progression', 'none'] as const;
export type PlanMode = (typeof PLAN_MODES)[number];

export type PlanBlock = {
  kind: BlockKind;
  /** Ids from the drill catalogue (step 2). Free-text exercises are not accepted. */
  drillIds: readonly string[];
  minutes: number;
  rpeCap: number;
  /** The soreness or focus zone this block is for, if any. */
  targetZone: BodyZone | null;
};

export type CoachingPlan = {
  mode: PlanMode;
  blocks: readonly PlanBlock[];
  /** Zones that got no drills because of severity — shown with the referral line. */
  referredZones: readonly BodyZone[];
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type SorenessError =
  | { code: 'TOO_MANY_ZONES'; max: number }
  | { code: 'UNKNOWN_ZONE'; value: unknown }
  | { code: 'BAD_SIDE'; zoneId: BodyZone; value: unknown }
  | { code: 'BAD_SEVERITY'; zoneId: BodyZone; value: unknown }
  | { code: 'DUPLICATE_ZONE'; zoneId: BodyZone; side: Side };

export function isSportType(v: unknown): v is SportType {
  return typeof v === 'string' && (SPORT_TYPES as readonly string[]).includes(v);
}

export function isSeasonPhase(v: unknown): v is SeasonPhase {
  return typeof v === 'string' && (SEASON_PHASES as readonly string[]).includes(v);
}

export function isBodyZone(v: unknown): v is BodyZone {
  return typeof v === 'string' && (BODY_ZONES as readonly string[]).includes(v);
}

function isSeverity(v: unknown): v is SorenessSeverity {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
}

/** Paired zones take left/right/both; central zones only 'center'. */
export function sideAllowed(zone: BodyZone, side: Side): boolean {
  return PAIRED_ZONES.has(zone) ? side !== 'center' : side === 'center';
}

/**
 * Validates what the silhouette sends. All problems are reported at once so
 * the UI can show them together; nothing is silently "fixed".
 */
export function parseSorenessZones(input: unknown): Result<SorenessZone[], SorenessError[]> {
  if (!Array.isArray(input)) return { ok: false, error: [{ code: 'UNKNOWN_ZONE', value: input }] };
  const errors: SorenessError[] = [];
  if (input.length > SORENESS_RULES.maxZones) errors.push({ code: 'TOO_MANY_ZONES', max: SORENESS_RULES.maxZones });

  const out: SorenessZone[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    if (!isBodyZone(r.zoneId)) {
      errors.push({ code: 'UNKNOWN_ZONE', value: r.zoneId });
      continue;
    }
    const zoneId = r.zoneId;
    const side = r.side;
    if (typeof side !== 'string' || !(SIDES as readonly string[]).includes(side) || !sideAllowed(zoneId, side as Side)) {
      errors.push({ code: 'BAD_SIDE', zoneId, value: side });
      continue;
    }
    if (!isSeverity(r.severity)) {
      errors.push({ code: 'BAD_SEVERITY', zoneId, value: r.severity });
      continue;
    }
    const key = `${zoneId}:${side}`;
    if (seen.has(key)) {
      errors.push({ code: 'DUPLICATE_ZONE', zoneId, side: side as Side });
      continue;
    }
    seen.add(key);
    out.push({ zoneId, side: side as Side, severity: r.severity });
  }
  return errors.length > 0 ? { ok: false, error: errors } : { ok: true, value: out };
}

/** Row shape in adp.check_ins.soreness_zones (snake_case, checked by adp.valid_soreness_zones). */
export type SorenessZoneRow = { zone_id: BodyZone; side: Side; severity: SorenessSeverity };

export function toSorenessRows(zones: readonly SorenessZone[]): SorenessZoneRow[] {
  return zones.map((z) => ({ zone_id: z.zoneId, side: z.side, severity: z.severity }));
}

/** Reads the stored column back through the same validation as the UI input. */
export function fromSorenessRows(rows: unknown): Result<SorenessZone[], SorenessError[]> {
  if (!Array.isArray(rows)) return parseSorenessZones(rows);
  return parseSorenessZones(
    rows.map((r) => {
      const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
      return { zoneId: o.zone_id, side: o.side, severity: o.severity };
    })
  );
}

/** Whether a zone may get self-care drills, or only the referral line. */
export function selfCareAllowed(zone: SorenessZone): boolean {
  const limit = CAUTIOUS_ZONES.has(zone.zoneId)
    ? SORENESS_RULES.cautiousZoneReferFrom - 1
    : SORENESS_RULES.selfCareMaxSeverity;
  return zone.severity <= limit;
}

/** The stricter of two ceilings (the engine can only be tightened, never loosened). */
export function stricterCeiling(a: LoadCeiling, b: LoadCeiling): LoadCeiling {
  return LOAD_CEILINGS.indexOf(a) >= LOAD_CEILINGS.indexOf(b) ? a : b;
}
