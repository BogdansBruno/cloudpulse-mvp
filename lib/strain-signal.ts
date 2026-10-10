// lib/strain-signal.ts
//
// "Overload signal": a transparent rule, not a prediction. It reads the same
// facts the Readiness Engine already penalises (lib/readiness-engine.ts) and
// says out loud WHICH of them are present today. No percentages, no "injury
// probability": the number of factors and their names are the whole output.
//
//   factors (each already a penalty in the engine, same thresholds):
//     load      ACWR above 1.3 (the "rising" band)
//     wellness  wellness index worse than the athlete's own baseline
//     rest      more than 6 training days in a row
//     exam      an exam in the next 3 days (EXAM_WINDOW_DAYS)
//     monotony  monotony above 2.0
//
//   level:
//     high   ACWR above 1.5 (a spike), or 3+ factors, or a red zone with any factor
//     watch  2 factors, or a rising load while the zone is not green
//     none   anything else
//
// What to do about it is the human's decision: the signal only suggests an
// easier day and talking to the coach. Pain is not handled here at all — pain
// goes to the Safety Guard and "doctor / school nurse / physio" (roadmap rule 3).
//
// Pure functions only; unit-tested in strain-signal.test.ts.

import { addDays } from './checkin-streak';
import { EXAM_WINDOW_DAYS } from './exam-storm';

export type StrainZone = 'green' | 'yellow' | 'red';
export type StrainFactor = 'load' | 'wellness' | 'rest' | 'exam' | 'monotony';
export type StrainLevel = 'none' | 'watch' | 'high';

export const STRAIN_FACTORS: readonly StrainFactor[] = ['load', 'wellness', 'rest', 'exam', 'monotony'];

/** Same limits as lib/readiness-engine.ts. */
export const ACWR_RISING = 1.3;
export const ACWR_SPIKE_LIMIT = 1.5;

export type StrainInput = {
  acwr: number | null;
  zone: StrainZone | null;
  wellnessWorse?: boolean;
  noRest?: boolean;
  examSoon?: boolean;
  monotonyHigh?: boolean;
};

export type StrainSignal = {
  level: StrainLevel;
  factors: StrainFactor[];
  spike: boolean;
};

export function strainSignal(input: StrainInput): StrainSignal {
  const factors: StrainFactor[] = [];
  const acwr = input.acwr;
  const spike = acwr !== null && Number.isFinite(acwr) && acwr > ACWR_SPIKE_LIMIT;
  const rising = acwr !== null && Number.isFinite(acwr) && acwr > ACWR_RISING;
  if (rising) factors.push('load');
  if (input.wellnessWorse) factors.push('wellness');
  if (input.noRest) factors.push('rest');
  if (input.examSoon) factors.push('exam');
  if (input.monotonyHigh) factors.push('monotony');

  const n = factors.length;
  const zone = input.zone;
  let level: StrainLevel = 'none';
  if (spike || n >= 3 || (zone === 'red' && n >= 1)) level = 'high';
  else if (n === 2 || (rising && zone !== null && zone !== 'green')) level = 'watch';
  return { level, factors, spike };
}

/** Penalty codes of the engine (ReadinessHistoryPoint.penaltyCodes) → signal input. */
export function strainInputFromPenalties(
  acwr: number | null,
  zone: StrainZone | null,
  codes: readonly string[] | undefined
): StrainInput {
  const has = (c: string) => !!codes && codes.includes(c);
  return {
    acwr,
    zone,
    wellnessWorse: has('WELLNESS_WORSE'),
    noRest: has('NO_REST_STREAK'),
    examSoon: has('EXAM_SOON'),
    monotonyHigh: has('MONOTONY_HIGH'),
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Days until the nearest exam inside the window (0 = today), or null. */
export function examInDays(today: string, examDates: readonly string[] | null | undefined): number | null {
  if (!examDates) return null;
  let best: number | null = null;
  for (let i = 0; i <= EXAM_WINDOW_DAYS; i++) {
    const d = addDays(today, i);
    if (examDates.some((e) => DATE_RE.test(e) && e === d)) {
      best = i;
      break;
    }
  }
  return best;
}
