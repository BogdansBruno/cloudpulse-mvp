import type { Penalty, SafetyViolation, InconsistencyFlag } from '@/lib/readiness-engine';
import type { translations } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// The engine (lib/readiness-engine.ts) and the get-readiness Edge Function
// return WHY a score is what it is as `code` + `params` — never as finished
// sentences. `reason`/`message` on those objects stay in Russian on purpose
// (see the comment on Penalty in readiness-engine.ts): they're what the
// existing unit tests assert on and what the AI coach prompt reads as
// ground-truth context, not UI copy.
//
// This is the one place that turns code + params into a sentence in the
// athlete's/coach's own UI language. Every screen that shows a penalty,
// Safety Guard violation or inconsistency flag (check-in, coach dashboard)
// should go through these, not read `.reason` / `.message` directly.
// ---------------------------------------------------------------------------

type Dict = (typeof translations)['en'];

export function translatePenalty(t: Dict, p: Penalty): string {
  const e = t.engine;
  const params = p.params ?? {};
  switch (p.code) {
    case 'ACWR_SPIKE':
      return e.penaltyAcwrSpike(String(params.acwr));
    case 'ACWR_RISING':
      return e.penaltyAcwrRising(String(params.acwr));
    case 'ACWR_LOW':
      return e.penaltyAcwrLow(String(params.acwr));
    case 'WELLNESS_WORSE':
      return e.penaltyWellnessWorse(Number(params.score), String(params.baseline));
    case 'NO_REST_STREAK':
      return e.penaltyNoRestStreak(Number(params.days));
    case 'EXAM_SOON':
      return e.penaltyExamSoon;
    case 'MONOTONY_HIGH':
      return e.penaltyMonotonyHigh(String(params.monotony));
    default:
      return p.reason; // unknown code (shouldn't happen) — fall back rather than show nothing
  }
}

export function translateViolation(t: Dict, v: SafetyViolation): string {
  const e = t.engine;
  switch (v.code) {
    case 'PAIN_REPORTED':
      return e.violationPain(v.params?.zone ?? null);
    case 'MATCH_DAY':
      return e.violationMatchDay;
    case 'PRE_MATCH':
      return e.violationPreMatch;
    case 'POST_MATCH':
      return e.violationPostMatch;
    default:
      return v.message;
  }
}

export function translateInconsistency(t: Dict, f: InconsistencyFlag): string {
  const e = t.engine;
  switch (f.code) {
    case 'FATIGUE_VS_ACWR':
      return e.inconsistencyFatigueVsAcwr(Number(f.params.fatigue), String(f.params.acwr));
    case 'FATIGUE_VS_STREAK':
      return e.inconsistencyFatigueVsStreak(Number(f.params.streak));
    default:
      return '';
  }
}
