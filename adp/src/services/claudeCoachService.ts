// adp/src/services/claudeCoachService.ts
//
// Sport-Aware AI Coach — the whole safe pipeline in one call:
//
//   engine limits + sport + soreness map
//     → buildCoachingPrompt (Context Guard: frozen context, no identity)
//     → the model (Claude) — optional, may fail, may misbehave
//     → validatePlan (21 rules)
//     → the plan the athlete sees: the AI's if it passed, otherwise the
//       engine's own rules-only plan. The athlete never sees an error.
//
// The model call is injected (ModelCall), so this file has no network code
// and is fully unit-tested with fake models. The CloudPulse server passes a
// Claude-backed call (lib/adp-claude.ts), or null when there is no API key /
// the athlete hit the rate limit.

import type { EngineLimits, SorenessZone, SportProfile } from '../types/sportProfile';
import type { AdpLang } from '../components/labels';
import { buildCoachingPrompt, type ClaudeRequest } from './AIPromptBuilder';
import { fallbackPlan, parseModelReply, validatePlan, type ModelCall, type PlanViolation } from './planGuard';
import { buildPlanView, type PlanView } from './planView';

export type AiStatus =
  /** The AI's plan passed every rule and is shown. */
  | 'used'
  /** The AI answered, but broke at least one rule → rules-only plan. */
  | 'rejected'
  /** No answer: network error, timeout, API error, or prose instead of JSON. */
  | 'error'
  /** The AI was not asked: no model configured, rate limit, or a no-training day. */
  | 'skipped';

export type SafePlanResult = {
  view: PlanView;
  /** true when the athlete sees the rules-only plan (the spec's isFallback). */
  isFallback: boolean;
  ai: { status: AiStatus; violations: PlanViolation['code'][] };
};

/** Runs a prepared request through the model and the guard. */
export async function safePlanFromRequest(request: ClaudeRequest, callModel: ModelCall | null): Promise<SafePlanResult> {
  const ctx = request.context;
  const rules = (status: AiStatus, violations: PlanViolation['code'][] = []): SafePlanResult => ({
    view: buildPlanView(ctx, fallbackPlan(ctx), 'rules'),
    isFallback: true,
    ai: { status, violations },
  });

  // A day with no training blocks needs no AI at all.
  if (!callModel || ctx.limits.mode === 'none') return rules('skipped');

  let reply: string;
  try {
    reply = await callModel(request);
  } catch {
    return rules('error');
  }

  const parsed = parseModelReply(reply);
  if (parsed === null) return rules('error', ['NOT_JSON']);

  const checked = validatePlan(parsed, ctx);
  if (!checked.ok) return rules('rejected', [...new Set(checked.violations.map((v) => v.code))]);

  return { view: buildPlanView(ctx, checked.plan, 'ai'), isFallback: false, ai: { status: 'used', violations: [] } };
}

/**
 * The spec's entry point: generateSafeWorkoutPlan(studentProfile, engineLimits, sorenessMap).
 */
export async function generateSafeWorkoutPlan(
  studentProfile: Pick<SportProfile, 'sportType' | 'seasonPhase'> & { lang: AdpLang; request?: string | null },
  engineLimits: EngineLimits,
  sorenessMap: readonly SorenessZone[],
  callModel: ModelCall | null
): Promise<SafePlanResult> {
  const request = buildCoachingPrompt(
    { lang: studentProfile.lang, soreness: sorenessMap, request: studentProfile.request ?? null },
    engineLimits,
    { sportType: studentProfile.sportType, seasonPhase: studentProfile.seasonPhase }
  );
  return safePlanFromRequest(request, callModel);
}
