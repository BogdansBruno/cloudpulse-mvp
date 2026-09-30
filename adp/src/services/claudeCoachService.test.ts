import { describe, it, expect } from 'vitest';
import type { EngineLimits, SorenessZone } from '../types/sportProfile';
import type { ClaudeRequest } from './AIPromptBuilder';
import { generateSafeWorkoutPlan } from './claudeCoachService';
import { parseModelReply } from './planGuard';

const engine = (over: Partial<EngineLimits> = {}): EngineLimits => ({
  date: '2026-10-12',
  ceiling: 'yellow',
  readinessScore: 58,
  acwr: 1.34,
  hooperIndex: 15,
  reasonCodes: [],
  examStorm: false,
  rtp: { state: 'none', clearedOn: null },
  ...over,
});
const quad: SorenessZone[] = [{ zoneId: 'quadriceps', side: 'both', severity: 4 }];
const athlete = { lang: 'ru' as const, sportType: 'football' as const, seasonPhase: null };

/** Builds a plan only from what the prompt TEXT says, like a well-behaved model. */
async function honest(req: ClaudeRequest): Promise<string> {
  const m = req.messages[0].content.match(/<coaching_context>\n([\s\S]*?)\n<\/coaching_context>/)!;
  const ctx = JSON.parse(m[1]);
  const quadId = ctx.allowed.relief.quadriceps[0];
  const pre = ctx.allowed.prehab[0];
  const walk = ctx.allowed.general.aerobic_base[0];
  const card = (id: string) => ctx.drills[id];
  const block = (id: string, targetZone: string | null) => ({
    kind: card(id).kind,
    drillIds: [id],
    minutes: card(id).minutes,
    rpeCap: card(id).rpe,
    targetZone,
  });
  return (
    'Вот план:\n' +
    JSON.stringify({
      mode: ctx.limits.mode,
      blocks: [block(quadId, 'quadriceps'), block(pre, null), block(walk, null)],
      referredZones: [],
      explanation: `Готовность ${ctx.engine.readinessScore}: бедро ${4}/5, поэтому сначала мягко — ${card(quadId).name}.`,
    })
  );
}

describe('generateSafeWorkoutPlan — the model is asked, the guard decides', () => {
  it('good AI answer → shown, source ai, not a fallback', async () => {
    const r = await generateSafeWorkoutPlan(athlete, engine(), quad, honest);
    expect(r.ai.status).toBe('used');
    expect(r.isFallback).toBe(false);
    expect(r.view.source).toBe('ai');
    expect(r.view.blocks[0].role).toBe('relief');
    expect(r.view.explanation.startsWith('Готовность 58')).toBe(true);
  });

  it('AI breaks a rule → rules-only plan, the reason is logged as codes, the athlete sees no error', async () => {
    const r = await generateSafeWorkoutPlan(athlete, engine(), quad, async () =>
      JSON.stringify({
        mode: 'full',
        blocks: [{ kind: 'bodyweight_strength', drillIds: ['bodyweight_squat'], minutes: 10, rpeCap: 8, targetZone: null }],
        referredZones: [],
        explanation: 'Это ускорит лечение на 20%.',
      })
    );
    expect(r.ai.status).toBe('rejected');
    expect(r.isFallback).toBe(true);
    expect(r.view.source).toBe('rules');
    for (const c of ['RPE_OVER_LIMIT', 'RELIEF_BLOCK_WRONG', 'MEDICAL_LANGUAGE', 'PERCENTAGE']) expect(r.ai.violations).toContain(c);
    expect(r.view.blocks[0].targetZone).toBe('quadriceps');
  });

  it('timeout / API error / prose → rules-only plan', async () => {
    const t = await generateSafeWorkoutPlan(athlete, engine(), quad, async () => {
      throw new Error('ETIMEDOUT');
    });
    expect([t.ai.status, t.isFallback]).toEqual(['error', true]);
    const p = await generateSafeWorkoutPlan(athlete, engine(), quad, async () => 'Извини, не могу.');
    expect([p.ai.status, p.ai.violations]).toEqual(['error', ['NOT_JSON']]);
  });

  it('no model configured → rules-only plan, AI skipped', async () => {
    const r = await generateSafeWorkoutPlan(athlete, engine(), quad, null);
    expect([r.ai.status, r.view.source]).toEqual(['skipped', 'rules']);
  });

  it('pain day → the model is never called', async () => {
    let called = false;
    const r = await generateSafeWorkoutPlan(athlete, engine({ ceiling: 'blocked' }), quad, async () => {
      called = true;
      return '{}';
    });
    expect(called).toBe(false);
    expect([r.view.mode, r.ai.status]).toEqual(['none', 'skipped']);
  });
});

describe('parseModelReply — lenient outside, strict inside', () => {
  it('finds the object inside a sentence or code fence', () => {
    expect(parseModelReply('Вот план:\n{"a":1}\nУдачи!')).toEqual({ a: 1 });
    expect(parseModelReply('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('prose, arrays and broken JSON are still refused', () => {
    expect(parseModelReply('Sure! Here is your plan: {...}')).toBeNull();
    expect(parseModelReply('[1,2]')).toBeNull();
    expect(parseModelReply('no json here')).toBeNull();
  });
});
