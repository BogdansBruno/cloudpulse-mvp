// lib/adp-coach.ts
//
// Glue between CloudPulse and the ADP safe AI coach (adp/). Pure functions,
// unit-tested in adp-coach.test.ts.
//
// CloudPulse already decides the day: the readiness engine gives a zone and
// Safety Guard gives hard stops (pain, match). Here that verdict is handed to
// the ADP coach module as its EngineLimits — translated, never softened:
//   - pain reported today (or the engine's pain block) → 'blocked';
//   - otherwise the engine zone is the ceiling: green / yellow / red;
//   - MATCH_DAY / PRE_MATCH / POST_MATCH pass through as reason codes, and the
//     coach module turns them into "activation only" / "recovery" days;
//   - EXAM_SOON (exam within 3 days) → the 12-minute micro-dose;
//   - Return-to-Play: not cleared → recovery only; cleared → graded return.

import type { ReadinessResult, SafetyViolation } from './readiness-engine';
import type { RtpStatus } from './return-to-play';
import type { EngineLimits, LoadCeiling, SportType } from '../adp/src/types/sportProfile';

/** Onboarding stores the sport as a label ("Football", "Gym / General fitness", …). */
export function adpSportFromProfile(sport: string | null | undefined): SportType | null {
  const s = (sport ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'football' || s === 'soccer') return 'football';
  if (s === 'basketball') return 'basketball';
  if (s === 'athletics') return 'athletics';
  if (s === 'swimming') return 'swimming';
  if (s === 'tennis') return 'tennis';
  return 'other';
}

export function engineLimitsFromCloudPulse(input: {
  date: string;
  readiness: ReadinessResult;
  safetyViolations: readonly SafetyViolation[];
  rtp: RtpStatus;
}): EngineLimits {
  const { date, readiness, safetyViolations, rtp } = input;
  const violationCodes = safetyViolations.map((v) => v.code);
  const pain = readiness.isPainBlocked || violationCodes.includes('PAIN_REPORTED');
  const ceiling: LoadCeiling = pain ? 'blocked' : readiness.zone;

  const reasonCodes = [...new Set<string>([...violationCodes, ...readiness.penalties.map((p) => p.code)])];

  const rtpLimits: EngineLimits['rtp'] =
    rtp.state === 'none'
      ? { state: 'none', clearedOn: null }
      : rtp.state === 'cleared'
        ? { state: 'cleared', clearedOn: rtp.clearedAt ? rtp.clearedAt.slice(0, 10) : null }
        : { state: rtp.state, clearedOn: null };

  return {
    date,
    ceiling,
    readinessScore: readiness.score,
    acwr: readiness.acwr,
    hooperIndex: readiness.hooperScore,
    reasonCodes,
    examStorm: readiness.penalties.some((p) => p.code === 'EXAM_SOON'),
    rtp: rtpLimits,
  };
}
