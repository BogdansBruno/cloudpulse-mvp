import { describe, it, expect } from 'vitest';
import { briefVerdict, daysUntil, parseMatchBriefs } from './match-brief';
import { classifyForMatch } from './match-roster';

const row = (over: Record<string, unknown> = {}) => ({
  link_id: 'l1',
  match_date: '2026-10-04',
  checked_in: true,
  zone: 'green',
  pain_blocked: false,
  load_spike: false,
  rtp_state: 'none',
  clean_days: 0,
  ...over,
});

describe('pre-match brief — the parent sees the coach verdict, nothing more', () => {
  it('same groups as the coach squad', () => {
    const cases: [Record<string, unknown>, string][] = [
      [{}, 'available'],
      [{ zone: 'red' }, 'limited'],
      [{ load_spike: true }, 'limited'],
      [{ pain_blocked: true }, 'out'],
      [{ checked_in: false }, 'unknown'],
      [{ rtp_state: 'restricted', clean_days: 1 }, 'out'],
      [{ rtp_state: 'ready', clean_days: 2 }, 'limited'],
    ];
    for (const [over, group] of cases) {
      const [b] = parseMatchBriefs([row(over)]);
      expect(briefVerdict(b).group).toBe(group);
    }
  });

  it('matches classifyForMatch for the coach given the same facts', () => {
    const [b] = parseMatchBriefs([row({ zone: 'red', load_spike: true })]);
    const coach = classifyForMatch({ score: 38, zone: 'red', acwr: 1.7, painBlocked: false, painZone: null });
    expect(briefVerdict(b).group).toBe(coach.group);
    expect(briefVerdict(b).reasons.map((r) => r.code)).toEqual(coach.reasons.map((r) => r.code));
  });

  it('no score and no ACWR number ever reach the parent', () => {
    const [b] = parseMatchBriefs([row({ zone: 'red', load_spike: true })]);
    for (const r of briefVerdict(b).reasons) {
      if (r.code === 'LOW_READINESS') expect(r.score).toBeNull();
      if (r.code === 'LOAD_SPIKE') expect(r.acwr).toBeNull();
    }
    const [ok] = parseMatchBriefs([row()]);
    expect(briefVerdict(ok).reasons).toEqual([{ code: 'OK', score: null }]);
  });

  it('bad rows are dropped; days until the match', () => {
    expect(parseMatchBriefs([{ link_id: 'x' }, null, row({ match_date: 'soon' })])).toEqual([]);
    expect(daysUntil('2026-10-04', '2026-10-02')).toBe(2);
  });
});
