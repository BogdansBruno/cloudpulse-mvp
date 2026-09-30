// adp/src/services/planGuard.ts
//
// Sport-Aware AI Coach — step 3c: the guard on the AI's answer.
//
// The prompt ASKS the model to stay inside the CoachingContext; this file
// ENFORCES it. An answer is shown only if every block, drill, minute and word
// passes. Otherwise the athlete gets a deterministic plan built here without
// any AI, from the same context — so a bad or missing model answer can never
// produce an unsafe session, only a plainer one.
//
// Checks: shape, mode, only allowed drill ids in the right role, kind and
// effort within limits, total minutes, one relief block per sore zone,
// nothing on referred zones, no medical language, no numbers that are not in
// the context, no percentages.

import type { AdpLang } from '../components/labels';
import {
  BLOCK_KINDS,
  BODY_ZONES,
  PLAN_MODES,
  type BlockKind,
  type BodyZone,
  type CoachingPlan,
  type PlanBlock,
  type PlanMode,
} from '../types/sportProfile';
import { MAX_EXPLANATION_CHARS, type ClaudeRequest, type CoachingContext } from './AIPromptBuilder';
import { allowedIds } from './coachingLimits';
import { getDrill } from './rehabCatalog';

export type ValidatedPlan = CoachingPlan & { explanation: string };

export type PlanViolation =
  | { code: 'NOT_JSON' }
  | { code: 'BAD_SHAPE'; detail: string }
  | { code: 'MODE_MISMATCH'; expected: PlanMode; got: string }
  | { code: 'PLAN_IN_NONE_MODE' }
  | { code: 'KIND_NOT_ALLOWED'; kind: string }
  | { code: 'UNKNOWN_DRILL'; id: string }
  | { code: 'DRILL_NOT_ALLOWED'; id: string }
  | { code: 'DRILL_KIND_MISMATCH'; id: string; blockKind: BlockKind }
  | { code: 'DRILL_REPEATED'; id: string }
  | { code: 'RPE_OVER_LIMIT'; blockIndex: number; rpeCap: number; max: number }
  | { code: 'RPE_BELOW_DRILL'; id: string; rpeCap: number }
  | { code: 'BLOCK_TOO_SHORT'; blockIndex: number; minutes: number; needed: number }
  | { code: 'MINUTES_OVER_LIMIT'; total: number; max: number }
  | { code: 'RELIEF_BLOCK_WRONG'; zone: string }
  | { code: 'RELIEF_ZONE_MISSING'; zone: BodyZone }
  | { code: 'REFERRED_ZONE_TARGETED'; zone: BodyZone }
  | { code: 'REFERRAL_MISSING'; zone: BodyZone }
  | { code: 'EXPLANATION_TOO_LONG'; length: number }
  | { code: 'MEDICAL_LANGUAGE'; match: string }
  | { code: 'PERCENTAGE' }
  | { code: 'INVENTED_NUMBER'; value: string };

/** Every rule the validator enforces — one code each. Shown as "checked by N rules". */
export const PLAN_RULE_CODES = [
  'NOT_JSON',
  'BAD_SHAPE',
  'MODE_MISMATCH',
  'PLAN_IN_NONE_MODE',
  'KIND_NOT_ALLOWED',
  'UNKNOWN_DRILL',
  'DRILL_NOT_ALLOWED',
  'DRILL_KIND_MISMATCH',
  'DRILL_REPEATED',
  'RPE_OVER_LIMIT',
  'RPE_BELOW_DRILL',
  'BLOCK_TOO_SHORT',
  'MINUTES_OVER_LIMIT',
  'RELIEF_BLOCK_WRONG',
  'RELIEF_ZONE_MISSING',
  'REFERRED_ZONE_TARGETED',
  'REFERRAL_MISSING',
  'EXPLANATION_TOO_LONG',
  'MEDICAL_LANGUAGE',
  'PERCENTAGE',
  'INVENTED_NUMBER',
] as const satisfies readonly PlanViolation['code'][];

// Compile-time check: the list above covers every violation code.
type MissingRule = Exclude<PlanViolation['code'], (typeof PLAN_RULE_CODES)[number]>;
const _allRulesListed: [MissingRule] extends [never] ? true : never = true;
void _allRulesListed;

/**
 * Words that turn training advice into medical advice (RU / LV / EN stems).
 * "врач / ārsts / doctor / физиотерапевт / physio" are allowed: referring is fine.
 */
export const MEDICAL_WORDS =
  /лечени|лечит|вылечи|терапи(?!евт)|диагноз|травм|воспален|тендин|разрыв|таблетк|мазь|обезбол|ārstē|terapij|diagnoz|traum|iekaisum|tablet|treatment|treat |therapy|diagnos|injur|inflam|tendin|tear|pill|painkiller|ointment|supplement|протеин|добавк|uztura bagātin/i;

const INT = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/**
 * Pulls the JSON object out of a model reply. Tolerates ```json fences and a
 * stray sentence around the object; everything inside is still checked by
 * validatePlan, so being lenient here cannot let anything unsafe through.
 */
export function parseModelReply(text: string): unknown | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const candidates = [trimmed];
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first > 0 || (last >= 0 && last < trimmed.length - 1)) {
    if (first >= 0 && last > first) candidates.push(trimmed.slice(first, last + 1));
  }
  for (const c of candidates) {
    if (!c.startsWith('{') || !c.endsWith('}')) continue;
    try {
      const v: unknown = JSON.parse(c);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** Every number the explanation is allowed to mention. */
export function allowedNumbers(ctx: CoachingContext, blocks: readonly PlanBlock[]): Set<string> {
  const nums = new Set<string>();
  const add = (n: number | null | undefined) => {
    if (n === null || n === undefined || !Number.isFinite(n)) return;
    nums.add(String(n));
    nums.add(n.toFixed(2));
    nums.add(n.toFixed(1));
    nums.add(String(Math.round(n)));
  };
  add(ctx.engine.readinessScore);
  add(ctx.engine.acwr);
  add(ctx.engine.hooperIndex);
  add(ctx.limits.maxMinutes);
  add(ctx.limits.maxRpe);
  add(ctx.limits.rtpStage);
  for (const z of ctx.soreness.map) add(z.severity);
  add(5); // severity scale "x/5"
  add(10); // RPE scale "x/10"
  add(blocks.length);
  let total = 0;
  for (const b of blocks) {
    add(b.minutes);
    add(b.rpeCap);
    total += b.minutes;
    for (const id of b.drillIds) {
      const d = ctx.drills[id];
      if (!d) continue;
      add(d.minutes);
      add(d.rpe);
      if ('sets' in d.dose) add(d.dose.sets);
      if ('reps' in d.dose) add(d.dose.reps);
      if ('seconds' in d.dose) add(d.dose.seconds);
      if ('minutes' in d.dose) add(d.dose.minutes);
    }
  }
  add(total);
  // Numbers that are part of a drill name in the context ("90/90 switches").
  for (const d of Object.values(ctx.drills)) for (const m of d.name.matchAll(/\d+/g)) nums.add(m[0]);
  return nums;
}

function checkExplanation(text: string, ctx: CoachingContext, blocks: readonly PlanBlock[]): PlanViolation[] {
  const out: PlanViolation[] = [];
  if (text.length > MAX_EXPLANATION_CHARS) out.push({ code: 'EXPLANATION_TOO_LONG', length: text.length });
  const med = text.match(MEDICAL_WORDS);
  if (med) out.push({ code: 'MEDICAL_LANGUAGE', match: med[0] });
  if (/%|процент|procent|percent/i.test(text)) out.push({ code: 'PERCENTAGE' });
  const allowed = allowedNumbers(ctx, blocks);
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const v = m[0].replace(',', '.');
    if (!allowed.has(v) && !allowed.has(String(Number(v)))) out.push({ code: 'INVENTED_NUMBER', value: m[0] });
  }
  return out;
}

/** Full check of a parsed model answer against the context it was given. */
export function validatePlan(raw: unknown, ctx: CoachingContext): { ok: true; plan: ValidatedPlan } | { ok: false; violations: PlanViolation[] } {
  const v: PlanViolation[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, violations: [{ code: 'NOT_JSON' }] };
  const r = raw as Record<string, unknown>;

  if (typeof r.mode !== 'string' || !(PLAN_MODES as readonly string[]).includes(r.mode)) {
    return { ok: false, violations: [{ code: 'BAD_SHAPE', detail: 'mode' }] };
  }
  if (!Array.isArray(r.blocks) || !Array.isArray(r.referredZones) || typeof r.explanation !== 'string') {
    return { ok: false, violations: [{ code: 'BAD_SHAPE', detail: 'blocks/referredZones/explanation' }] };
  }
  if (r.mode !== ctx.limits.mode) v.push({ code: 'MODE_MISMATCH', expected: ctx.limits.mode, got: r.mode });

  const ids = allowedIds(ctx.allowed);
  const blocks: PlanBlock[] = [];
  const used = new Set<string>();
  const reliefCovered = new Set<BodyZone>();

  r.blocks.forEach((rawBlock, i) => {
    const b = (rawBlock && typeof rawBlock === 'object' ? rawBlock : {}) as Record<string, unknown>;
    if (
      typeof b.kind !== 'string' ||
      !(BLOCK_KINDS as readonly string[]).includes(b.kind) ||
      !Array.isArray(b.drillIds) ||
      b.drillIds.length === 0 ||
      !b.drillIds.every((x) => typeof x === 'string') ||
      !INT(b.minutes) ||
      b.minutes < 1 ||
      !INT(b.rpeCap) ||
      !(b.targetZone === null || (typeof b.targetZone === 'string' && (BODY_ZONES as readonly string[]).includes(b.targetZone)))
    ) {
      v.push({ code: 'BAD_SHAPE', detail: `block ${i}` });
      return;
    }
    const kind = b.kind as BlockKind;
    const drillIds = b.drillIds as string[];
    const targetZone = b.targetZone as BodyZone | null;
    const minutes = b.minutes as number;
    const rpeCap = b.rpeCap as number;

    if (!ctx.limits.allowedKinds.includes(kind)) v.push({ code: 'KIND_NOT_ALLOWED', kind });
    if (rpeCap > ctx.limits.maxRpe) v.push({ code: 'RPE_OVER_LIMIT', blockIndex: i, rpeCap, max: ctx.limits.maxRpe });

    let needed = 0;
    for (const id of drillIds) {
      const drill = getDrill(id);
      if (!drill) {
        v.push({ code: 'UNKNOWN_DRILL', id });
        continue;
      }
      if (!ids.has(id)) v.push({ code: 'DRILL_NOT_ALLOWED', id });
      if (drill.kind !== kind) v.push({ code: 'DRILL_KIND_MISMATCH', id, blockKind: kind });
      if (drill.rpe > rpeCap) v.push({ code: 'RPE_BELOW_DRILL', id, rpeCap });
      if (used.has(id)) v.push({ code: 'DRILL_REPEATED', id });
      used.add(id);
      for (const z of drill.zones) if (ctx.soreness.referredZones.includes(z)) v.push({ code: 'REFERRED_ZONE_TARGETED', zone: z });
      needed += drill.kind === 'aerobic_base' ? 0 : drill.minutes;
    }
    if (minutes < needed) v.push({ code: 'BLOCK_TOO_SHORT', blockIndex: i, minutes, needed });

    if (targetZone && ctx.soreness.referredZones.includes(targetZone)) {
      v.push({ code: 'REFERRED_ZONE_TARGETED', zone: targetZone });
    } else if (targetZone && ctx.soreness.reliefZones.includes(targetZone)) {
      const reliefIds = ctx.allowed.relief[targetZone] ?? [];
      if (kind !== 'mobility' || !drillIds.every((id) => reliefIds.includes(id))) v.push({ code: 'RELIEF_BLOCK_WRONG', zone: targetZone });
      else reliefCovered.add(targetZone);
    }

    blocks.push({ kind, drillIds, minutes, rpeCap, targetZone });
  });

  // A sore (relief) zone may be touched only by its relief drills.
  for (const b of blocks) {
    const isReliefBlock = b.targetZone !== null && ctx.soreness.reliefZones.includes(b.targetZone);
    if (isReliefBlock) continue;
    for (const id of b.drillIds) {
      const drill = getDrill(id);
      if (!drill) continue;
      for (const z of drill.zones) {
        if (ctx.soreness.reliefZones.includes(z) && drill.use !== 'relief') v.push({ code: 'RELIEF_BLOCK_WRONG', zone: z });
      }
    }
  }

  if (ctx.limits.mode === 'none' && blocks.length > 0) v.push({ code: 'PLAN_IN_NONE_MODE' });
  if (ctx.limits.mode !== 'none') {
    for (const z of ctx.soreness.reliefZones) {
      if ((ctx.allowed.relief[z]?.length ?? 0) > 0 && !reliefCovered.has(z)) v.push({ code: 'RELIEF_ZONE_MISSING', zone: z });
    }
  }
  const total = blocks.reduce((s, b) => s + b.minutes, 0);
  if (total > ctx.limits.maxMinutes) v.push({ code: 'MINUTES_OVER_LIMIT', total, max: ctx.limits.maxMinutes });

  const referred = (r.referredZones as unknown[]).filter((z): z is BodyZone => typeof z === 'string' && (BODY_ZONES as readonly string[]).includes(z));
  for (const z of ctx.soreness.referredZones) if (!referred.includes(z)) v.push({ code: 'REFERRAL_MISSING', zone: z });

  v.push(...checkExplanation(r.explanation, ctx, blocks));

  if (v.length > 0) return { ok: false, violations: v };
  return {
    ok: true,
    plan: { mode: ctx.limits.mode, blocks, referredZones: [...ctx.soreness.referredZones], explanation: r.explanation },
  };
}

// ---------------------------------------------------------------------------
// Deterministic fallback — no AI, always inside the limits
// ---------------------------------------------------------------------------

const FALLBACK_TEXT: Readonly<Record<AdpLang, Record<PlanMode, string>>> = {
  ru: {
    none: 'Сегодня без тренировочных блоков — так решил движок готовности. Отдыхай.',
    recovery_only: 'Сегодня только восстановление: мягкая подвижность и дыхание.',
    micro_dose: 'Много учёбы — поэтому короткая микро-доза вместо полной тренировки.',
    rtp_progression: 'Постепенное возвращение после перерыва: нагрузка растёт по шагам.',
    full: 'Обычное дополнительное занятие в пределах, которые разрешил движок.',
  },
  lv: {
    none: 'Šodien bez treniņu blokiem — tā nolēma gatavības dzinējs. Atpūties.',
    recovery_only: 'Šodien tikai atjaunošanās: maigs kustīgums un elpošana.',
    micro_dose: 'Daudz mācību — tāpēc īsa mikrodeva pilna treniņa vietā.',
    rtp_progression: 'Pakāpeniska atgriešanās pēc pārtraukuma: slodze pieaug pa soļiem.',
    full: 'Parasta papildu nodarbība robežās, ko atļāva dzinējs.',
  },
  en: {
    none: 'No training blocks today — the readiness engine decided so. Rest up.',
    recovery_only: 'Recovery only today: gentle mobility and breathing.',
    micro_dose: 'Lots of school work — so a short micro-dose instead of a full session.',
    rtp_progression: 'Gradual return after a break: the load goes up step by step.',
    full: 'A normal extra session within the limits the engine allows.',
  },
};

/** Kinds to add after relief work, in order, by mode. */
const FALLBACK_ORDER: Readonly<Record<PlanMode, readonly BlockKind[]>> = {
  none: [],
  recovery_only: ['breathing_recovery', 'mobility'],
  micro_dose: ['activation', 'isometric', 'bodyweight_strength', 'mobility'],
  rtp_progression: ['mobility', 'activation', 'aerobic_base', 'isometric', 'bodyweight_strength'],
  full: ['mobility', 'activation', 'isometric', 'aerobic_base', 'bodyweight_strength', 'eccentric', 'breathing_recovery'],
};

export function fallbackPlan(ctx: CoachingContext): ValidatedPlan {
  const blocks: PlanBlock[] = [];
  const used = new Set<string>();
  let left = ctx.limits.maxMinutes;

  const place = (id: string, kind: BlockKind, targetZone: BodyZone | null): boolean => {
    const d = ctx.drills[id];
    if (!d || used.has(id) || d.kind !== kind || d.minutes > left || d.rpe > ctx.limits.maxRpe) return false;
    blocks.push({ kind, drillIds: [id], minutes: d.minutes, rpeCap: d.rpe, targetZone });
    used.add(id);
    left -= d.minutes;
    return true;
  };

  if (ctx.limits.mode !== 'none') {
    // 1. Every sore zone first.
    for (const z of ctx.soreness.reliefZones) {
      for (const id of ctx.allowed.relief[z] ?? []) if (place(id, 'mobility', z)) break;
    }
    // 2. Prehab for the sport (full / rtp only), up to two drills.
    if (ctx.limits.mode === 'full' || ctx.limits.mode === 'rtp_progression') {
      let n = 0;
      for (const id of ctx.allowed.prehab) {
        if (n >= 2) break;
        const d = ctx.drills[id];
        if (d && place(id, d.kind, null)) n++;
      }
    }
    // 3. Session body: season emphasis first, then the mode's default order.
    const order = [...ctx.limits.emphasis, ...FALLBACK_ORDER[ctx.limits.mode]].filter(
      (k, i, all) => all.indexOf(k) === i && ctx.limits.allowedKinds.includes(k)
    );
    for (const kind of order) {
      for (const id of ctx.allowed.general[kind] ?? []) if (place(id, kind, null)) break;
    }
  }

  return {
    mode: ctx.limits.mode,
    blocks,
    referredZones: [...ctx.soreness.referredZones],
    explanation: FALLBACK_TEXT[ctx.language][ctx.limits.mode],
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export type ModelCall = (request: ClaudeRequest) => Promise<string>;

export type CoachResult = {
  plan: ValidatedPlan;
  source: 'ai' | 'fallback';
  /** Why the AI answer was not used (empty when source is 'ai' or AI was skipped). */
  violations: readonly PlanViolation[];
  aiSkipped: boolean;
};

/**
 * Asks the model once; shows its plan only if it passes validatePlan.
 * On a "none" day the model is not called at all.
 */
export async function coachPlan(request: ClaudeRequest, callModel: ModelCall): Promise<CoachResult> {
  const ctx = request.context;
  if (ctx.limits.mode === 'none') return { plan: fallbackPlan(ctx), source: 'fallback', violations: [], aiSkipped: true };

  let reply: string;
  try {
    reply = await callModel(request);
  } catch {
    return { plan: fallbackPlan(ctx), source: 'fallback', violations: [{ code: 'NOT_JSON' }], aiSkipped: false };
  }
  const parsed = parseModelReply(reply);
  if (parsed === null) return { plan: fallbackPlan(ctx), source: 'fallback', violations: [{ code: 'NOT_JSON' }], aiSkipped: false };
  const result = validatePlan(parsed, ctx);
  if (result.ok) return { plan: result.plan, source: 'ai', violations: [], aiSkipped: false };
  return { plan: fallbackPlan(ctx), source: 'fallback', violations: result.violations, aiSkipped: false };
}
