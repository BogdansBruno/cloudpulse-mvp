import { describe, it, expect } from 'vitest';
import { AI_CALLS_PER_HOUR, PlanCache, planKey } from './adp-coach-cache';

describe('PlanCache — one model call per athlete and exact inputs', () => {
  it('same user + same context → same key; any change → new key', () => {
    const ctx = { date: '2026-10-12', soreness: [{ zoneId: 'quadriceps', side: 'both', severity: 4 }] };
    expect(planKey('u1', ctx)).toBe(planKey('u1', { ...ctx }));
    expect(planKey('u1', ctx)).not.toBe(planKey('u2', ctx));
    expect(planKey('u1', ctx)).not.toBe(planKey('u1', { ...ctx, date: '2026-10-13' }));
  });

  it('stores and expires after 12 hours', () => {
    let now = 0;
    const c = new PlanCache<string>(() => now);
    c.set('k', 'plan');
    expect(c.get('k')).toBe('plan');
    now = 12 * 3600_000 + 1;
    expect(c.get('k')).toBeNull();
  });

  it('two requests at the same time share one computation', async () => {
    const c = new PlanCache<string>();
    let runs = 0;
    const compute = async () => {
      runs++;
      await new Promise((r) => setTimeout(r, 5));
      return 'plan';
    };
    const [a, b] = await Promise.all([c.once('k', compute), c.once('k', compute)]);
    expect([a, b, runs]).toEqual(['plan', 'plan', 1]);
  });

  it(`at most ${AI_CALLS_PER_HOUR} model calls per athlete per hour`, () => {
    let now = 0;
    const c = new PlanCache<string>(() => now);
    for (let i = 0; i < AI_CALLS_PER_HOUR; i++) expect(c.takeAiCall('u1')).toBe(true);
    expect(c.takeAiCall('u1')).toBe(false);
    expect(c.takeAiCall('u2')).toBe(true);
    now = 3600_000 + 1;
    expect(c.takeAiCall('u1')).toBe(true);
  });
});
