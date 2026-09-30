// adp/src/services/planView.ts
//
// Turns a checked plan into what the athlete's screen shows: every drill
// with its name, cue and dose in the athlete's language, each block labelled
// by its role (gentle work for a sore muscle / prehab for the sport / main
// part), the reasons the day is as it is, and the fixed safety lines.
//
// Plain JSON, no functions — the API route sends it to the browser as is.
// Only ever built from a plan that passed validatePlan or from fallbackPlan,
// so nothing here can loosen a limit.

import type { AdpLang } from '../components/labels';
import type { IsoDate } from '../types/adp';
import type { BlockKind, BodyZone, LoadCeiling, PlanMode, SorenessZone } from '../types/sportProfile';
import type { CoachingContext } from './AIPromptBuilder';
import type { LimitReason } from './coachingLimits';
import { PLAN_RULE_CODES, type ValidatedPlan } from './planGuard';
import { getDrill, type Dose, type Equipment } from './rehabCatalog';

export type PlanSource = 'ai' | 'rules';
export type BlockRole = 'relief' | 'prehab' | 'general';

export type DrillView = {
  id: string;
  name: string;
  cue: string;
  dose: Dose;
  perSide: boolean;
  equipment: readonly Equipment[];
};

export type BlockView = {
  kind: BlockKind;
  role: BlockRole;
  minutes: number;
  rpeCap: number;
  targetZone: BodyZone | null;
  drills: DrillView[];
};

export type PlanView = {
  date: IsoDate;
  lang: AdpLang;
  source: PlanSource;
  mode: PlanMode;
  engine: { ceiling: LoadCeiling; readinessScore: number | null };
  limits: { maxMinutes: number; maxRpe: number; reasons: readonly LimitReason[]; rtpStage: number | null };
  totalMinutes: number;
  blocks: BlockView[];
  soreness: { map: readonly SorenessZone[]; reliefZones: readonly BodyZone[]; referredZones: readonly BodyZone[] };
  explanation: string;
  stopRule: string;
  referral: string;
  /** How many rules the plan was checked against (validatePlan). */
  rulesChecked: number;
};

export function buildPlanView(ctx: CoachingContext, plan: ValidatedPlan, source: PlanSource): PlanView {
  const blocks: BlockView[] = plan.blocks.map((b) => {
    const drills: DrillView[] = b.drillIds.map((id) => {
      const d = getDrill(id)!;
      return { id, name: d.text[ctx.language].name, cue: d.text[ctx.language].cue, dose: d.dose, perSide: d.perSide, equipment: d.equipment };
    });
    const isRelief = b.targetZone !== null && ctx.soreness.reliefZones.includes(b.targetZone);
    const role: BlockRole = isRelief ? 'relief' : b.drillIds.some((id) => getDrill(id)?.use === 'prehab') ? 'prehab' : 'general';
    return { kind: b.kind, role, minutes: b.minutes, rpeCap: b.rpeCap, targetZone: b.targetZone, drills };
  });

  return {
    date: ctx.date,
    lang: ctx.language,
    source,
    mode: plan.mode,
    engine: { ceiling: ctx.engine.ceiling, readinessScore: ctx.engine.readinessScore },
    limits: {
      maxMinutes: ctx.limits.maxMinutes,
      maxRpe: ctx.limits.maxRpe,
      reasons: [...ctx.limits.reasons],
      rtpStage: ctx.limits.rtpStage,
    },
    totalMinutes: plan.blocks.reduce((s, b) => s + b.minutes, 0),
    blocks,
    soreness: {
      map: ctx.soreness.map.map((z) => ({ ...z })),
      reliefZones: [...ctx.soreness.reliefZones],
      referredZones: [...plan.referredZones],
    },
    explanation: plan.explanation,
    stopRule: ctx.fixedLines.stopRule,
    referral: ctx.fixedLines.referral,
    rulesChecked: PLAN_RULE_CODES.length,
  };
}
