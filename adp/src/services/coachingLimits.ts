// adp/src/services/coachingLimits.ts
//
// Sport-Aware AI Coach — step 3a: the effective limits for today's plan.
//
// "Engine decides, AI explains." This file is the "decides" part, with no AI
// in it: it takes the readiness engine's ceiling and TIGHTENS it (never
// loosens) with the rules below, then lists every drill that fits. The AI
// later chooses among these drills and explains the choice — nothing more.
//
// Order of rules (each can only make the day stricter):
//   1. engine ceiling (green / yellow / red / blocked)
//   2. Return-to-Play: not cleared yet → recovery only; cleared recently →
//      graded return over RTP_PROGRESSION.windowDays
//   3. match proximity from the engine's reason codes
//   4. season phase (set by the coach)
//   5. exam storm → 12-minute micro-dose instead of a full session
//   6. soreness map → sore zones get relief only; too sore / cautious zones
//      get nothing but the referral line
//
// All numbers are drafts for the S&C coach / club doctor to approve.

import {
  BLOCK_KINDS,
  CEILING_RULES,
  MICRO_DOSE,
  selfCareAllowed,
  stricterCeiling,
  type BlockKind,
  type BodyZone,
  type EngineLimits,
  type LoadCeiling,
  type PlanMode,
  type SeasonPhase,
  type SorenessZone,
  type SportProfile,
  type SportType,
} from '../types/sportProfile';
import { SPORT_FOCUS_ZONES } from '../types/sportProfile';
import { DRILLS, type Drill } from './rehabCatalog';
import { daysBetween } from './isoDate';

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/** Graded return after the coach's clearance (days since clearance). */
export const RTP_PROGRESSION = {
  windowDays: 14,
  stages: [
    { stage: 1, fromDay: 0, ceiling: 'yellow', noEccentric: true, maxRpe: 4 },
    { stage: 2, fromDay: 3, ceiling: 'yellow', noEccentric: false, maxRpe: 5 },
    { stage: 3, fromDay: 7, ceiling: 'green', noEccentric: false, maxRpe: 7 },
  ],
} as const satisfies {
  windowDays: number;
  stages: readonly { stage: number; fromDay: number; ceiling: LoadCeiling; noEccentric: boolean; maxRpe: number }[];
};

/** Extra session on top of team training: how much, by season phase. */
export const PHASE_RULES: Readonly<
  Record<SeasonPhase, { maxMinutes: number; maxRpe: number; noEccentric: boolean; emphasis: readonly BlockKind[] }>
> = {
  pre_season: { maxMinutes: 60, maxRpe: 8, noEccentric: false, emphasis: ['aerobic_base', 'bodyweight_strength', 'eccentric', 'activation'] },
  in_season: { maxMinutes: 30, maxRpe: 6, noEccentric: false, emphasis: ['mobility', 'activation', 'isometric'] },
  off_season: { maxMinutes: 45, maxRpe: 6, noEccentric: false, emphasis: ['aerobic_base', 'mobility', 'bodyweight_strength'] },
  recovery: { maxMinutes: 20, maxRpe: 4, noEccentric: true, emphasis: ['mobility', 'breathing_recovery', 'aerobic_base'] },
};

/** Around a match (engine reason codes): nothing heavy. */
export const MATCH_RULES = {
  /** Match today or tomorrow: activation and mobility only. */
  nearCodes: ['MATCH_DAY', 'PRE_MATCH'],
  nearKinds: ['mobility', 'activation', 'breathing_recovery'] as readonly BlockKind[],
  nearMaxRpe: 4,
  /** Day after a match: easy recovery only. */
  afterCodes: ['POST_MATCH'],
  afterKinds: ['mobility', 'breathing_recovery', 'aerobic_base'] as readonly BlockKind[],
  afterMaxRpe: 3,
  /** Back from a long away trip (CloudPulse team_trips, 48 h): the same easy work as after a match. */
  travelCodes: ['POST_TRAVEL'],
} as const;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export const LIMIT_REASONS = [
  'ENGINE_CEILING',
  'RTP_NOT_CLEARED',
  'RTP_PROGRESSION',
  'MATCH_NEAR',
  'MATCH_AFTER',
  'TRAVEL_RECOVERY',
  'SEASON_PHASE',
  'EXAM_STORM_MICRO_DOSE',
  'SORE_ZONE_RELIEF_ONLY',
  'SORE_ZONE_REFERRED',
] as const;
export type LimitReason = (typeof LIMIT_REASONS)[number];

export type EffectiveLimits = {
  mode: PlanMode;
  ceiling: LoadCeiling;
  maxMinutes: number;
  maxRpe: number;
  allowedKinds: readonly BlockKind[];
  /** Why the day is as strict as it is — the AI explains these, never overrides them. */
  reasons: readonly LimitReason[];
  /** 1..3 while in graded return after clearance, else null. */
  rtpStage: number | null;
  /** What the session should lean on (soft guidance for choosing, not a limit). */
  emphasis: readonly BlockKind[];
  /** Sore zones that may get relief drills today. */
  reliefZones: readonly BodyZone[];
  /** Sore zones that get no drills at all, only the referral line. */
  referredZones: readonly BodyZone[];
};

export type CandidateDrills = {
  /** Per sore zone: relief drills that fit today. */
  relief: Readonly<Partial<Record<BodyZone, readonly string[]>>>;
  /** Prehab for the sport's focus zones (never touching a sore zone). */
  prehab: readonly string[];
  /** General session content by kind. */
  general: Readonly<Partial<Record<BlockKind, readonly string[]>>>;
};

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

type Draft = {
  ceiling: LoadCeiling;
  maxMinutes: number;
  maxRpe: number;
  kinds: Set<BlockKind>;
  reasons: LimitReason[];
  mode: PlanMode;
  rtpStage: number | null;
};

function tighten(d: Draft, limit: { maxMinutes?: number; maxRpe?: number; kinds?: readonly BlockKind[] }): void {
  if (limit.maxMinutes !== undefined) d.maxMinutes = Math.min(d.maxMinutes, limit.maxMinutes);
  if (limit.maxRpe !== undefined) d.maxRpe = Math.min(d.maxRpe, limit.maxRpe);
  if (limit.kinds) for (const k of [...d.kinds]) if (!limit.kinds.includes(k)) d.kinds.delete(k);
}

function applyCeiling(d: Draft, ceiling: LoadCeiling): void {
  d.ceiling = stricterCeiling(d.ceiling, ceiling);
  const rule = CEILING_RULES[d.ceiling];
  tighten(d, { maxMinutes: rule.maxMinutes, maxRpe: rule.maxRpe, kinds: rule.allowedKinds });
}

function addReason(d: Draft, r: LimitReason): void {
  if (!d.reasons.includes(r)) d.reasons.push(r);
}

export function resolveLimits(
  engine: EngineLimits,
  profile: Pick<SportProfile, 'seasonPhase'>,
  soreness: readonly SorenessZone[]
): EffectiveLimits {
  const d: Draft = {
    ceiling: 'green',
    maxMinutes: Infinity,
    maxRpe: Infinity,
    kinds: new Set(BLOCK_KINDS),
    reasons: [],
    mode: 'full',
    rtpStage: null,
  };

  // 1. Engine
  applyCeiling(d, engine.ceiling);
  if (engine.ceiling !== 'green') addReason(d, 'ENGINE_CEILING');

  // 2. Return-to-Play
  if (engine.rtp.state === 'restricted' || engine.rtp.state === 'ready') {
    applyCeiling(d, 'red');
    addReason(d, 'RTP_NOT_CLEARED');
  } else if (engine.rtp.state === 'cleared' && engine.rtp.clearedOn) {
    const since = daysBetween(engine.rtp.clearedOn, engine.date);
    if (since >= 0 && since < RTP_PROGRESSION.windowDays) {
      const stage = [...RTP_PROGRESSION.stages].reverse().find((s) => since >= s.fromDay)!;
      applyCeiling(d, stage.ceiling);
      tighten(d, { maxRpe: stage.maxRpe });
      if (stage.noEccentric) d.kinds.delete('eccentric');
      d.rtpStage = stage.stage;
      addReason(d, 'RTP_PROGRESSION');
    }
  }

  // 3. Match proximity
  if (engine.reasonCodes.some((c) => (MATCH_RULES.nearCodes as readonly string[]).includes(c))) {
    tighten(d, { kinds: MATCH_RULES.nearKinds, maxRpe: MATCH_RULES.nearMaxRpe });
    addReason(d, 'MATCH_NEAR');
  } else if (engine.reasonCodes.some((c) => (MATCH_RULES.afterCodes as readonly string[]).includes(c))) {
    tighten(d, { kinds: MATCH_RULES.afterKinds, maxRpe: MATCH_RULES.afterMaxRpe });
    addReason(d, 'MATCH_AFTER');
  }

  // 3b. Back from a long trip: easy recovery work only (may add to a match rule).
  if (engine.reasonCodes.some((c) => (MATCH_RULES.travelCodes as readonly string[]).includes(c))) {
    tighten(d, { kinds: MATCH_RULES.afterKinds, maxRpe: MATCH_RULES.afterMaxRpe });
    addReason(d, 'TRAVEL_RECOVERY');
  }

  // 4. Season phase (null = not set: no phase adjustment)
  const phase = profile.seasonPhase ? PHASE_RULES[profile.seasonPhase] : null;
  if (phase) {
    const before = `${d.maxMinutes}/${d.maxRpe}/${d.kinds.size}`;
    tighten(d, { maxMinutes: phase.maxMinutes, maxRpe: phase.maxRpe });
    if (phase.noEccentric) d.kinds.delete('eccentric');
    if (`${d.maxMinutes}/${d.maxRpe}/${d.kinds.size}` !== before) addReason(d, 'SEASON_PHASE');
  }

  // 5. Exam storm → micro-dose (a short neuromuscular session, no long aerobic)
  let micro = false;
  if (engine.examStorm && d.ceiling !== 'blocked' && d.ceiling !== 'red') {
    tighten(d, { maxMinutes: MICRO_DOSE.minutes, maxRpe: MICRO_DOSE.maxRpe });
    d.kinds.delete('aerobic_base');
    d.kinds.delete('eccentric');
    micro = true;
    addReason(d, 'EXAM_STORM_MICRO_DOSE');
  }

  // Mode
  if (d.ceiling === 'blocked' || d.maxMinutes <= 0 || d.kinds.size === 0) d.mode = 'none';
  else if (d.ceiling === 'red') d.mode = 'recovery_only';
  else if (micro) d.mode = 'micro_dose';
  else if (d.rtpStage !== null) d.mode = 'rtp_progression';
  else d.mode = 'full';

  // 6. Soreness
  const reliefZones: BodyZone[] = [];
  const referredZones: BodyZone[] = [];
  for (const z of soreness) {
    const list = selfCareAllowed(z) ? reliefZones : referredZones;
    if (!list.includes(z.zoneId)) list.push(z.zoneId);
  }
  // If one side is referable and the other not, the zone as a whole is referred.
  const relief = reliefZones.filter((z) => !referredZones.includes(z));
  if (relief.length > 0) addReason(d, 'SORE_ZONE_RELIEF_ONLY');
  if (referredZones.length > 0) addReason(d, 'SORE_ZONE_REFERRED');

  const isNone = d.mode === 'none';
  return {
    mode: d.mode,
    ceiling: d.ceiling,
    maxMinutes: isNone ? 0 : d.maxMinutes,
    maxRpe: isNone ? 0 : d.maxRpe,
    allowedKinds: isNone ? [] : BLOCK_KINDS.filter((k) => d.kinds.has(k)),
    reasons: d.reasons,
    rtpStage: d.rtpStage,
    emphasis: phase ? phase.emphasis.filter((k) => d.kinds.has(k)) : [],
    reliefZones: relief,
    referredZones,
  };
}

// ---------------------------------------------------------------------------
// Candidates: every drill id the AI may use today
// ---------------------------------------------------------------------------

export function drillFits(drill: Drill, limits: EffectiveLimits): boolean {
  return (
    limits.mode !== 'none' &&
    limits.allowedKinds.includes(drill.kind) &&
    drill.rpe <= limits.maxRpe &&
    drill.minutes <= limits.maxMinutes
  );
}

export function candidateDrills(limits: EffectiveLimits, sport: SportType | null): CandidateDrills {
  const sore = new Set<BodyZone>([...limits.reliefZones, ...limits.referredZones]);
  const touchesSore = (x: Drill) => x.zones.some((z) => sore.has(z));
  const sportOk = (x: Drill) => x.sports.length === 0 || (sport !== null && x.sports.includes(sport));
  const order = (a: Drill, b: Drill) => {
    const sa = sport && a.sports.includes(sport) ? 0 : 1;
    const sb = sport && b.sports.includes(sport) ? 0 : 1;
    return sa - sb || a.rpe - b.rpe || a.id.localeCompare(b.id);
  };

  const relief: Partial<Record<BodyZone, string[]>> = {};
  for (const z of limits.reliefZones) {
    const ids = DRILLS.filter((x) => x.use === 'relief' && x.zones.includes(z) && drillFits(x, limits))
      // A relief drill for this zone must not also load a referred zone.
      .filter((x) => !x.zones.some((zz) => limits.referredZones.includes(zz)))
      .sort(order)
      .map((x) => x.id);
    if (ids.length > 0) relief[z] = ids;
  }

  const focus = sport ? SPORT_FOCUS_ZONES[sport] : [];
  const prehab =
    limits.mode === 'recovery_only'
      ? []
      : DRILLS.filter(
          (x) => x.use === 'prehab' && x.zones.some((z) => focus.includes(z)) && !touchesSore(x) && sportOk(x) && drillFits(x, limits)
        )
          .sort(order)
          .map((x) => x.id);

  const general: Partial<Record<BlockKind, string[]>> = {};
  for (const kind of limits.allowedKinds) {
    const ids = DRILLS.filter(
      (x) =>
        x.kind === kind &&
        (x.use === 'general' || (x.use === 'relief' && x.zones.length === 0)) &&
        !touchesSore(x) &&
        sportOk(x) &&
        drillFits(x, limits)
    )
      .sort(order)
      .map((x) => x.id);
    if (ids.length > 0) general[kind] = ids;
  }
  // Whole-body gentle mobility is always welcome, also on recovery days.
  if (limits.allowedKinds.includes('mobility')) {
    const gentle = DRILLS.filter(
      (x) => x.use === 'relief' && x.kind === 'mobility' && x.zones.length > 0 && !touchesSore(x) && drillFits(x, limits)
    )
      .sort(order)
      .map((x) => x.id);
    if (gentle.length > 0) general.mobility = [...(general.mobility ?? []), ...gentle];
  }

  return { relief, prehab, general };
}

/** Flat set of every allowed id (for the validator). */
export function allowedIds(c: CandidateDrills): Set<string> {
  const s = new Set<string>(c.prehab);
  for (const ids of Object.values(c.relief)) for (const id of ids ?? []) s.add(id);
  for (const ids of Object.values(c.general)) for (const id of ids ?? []) s.add(id);
  return s;
}

