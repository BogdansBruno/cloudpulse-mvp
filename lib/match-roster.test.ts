import { describe, it, expect } from 'vitest';
import {
  buildMatchRoster,
  classifyForMatch,
  nextTeamMatch,
  rosterShareText,
  type RosterCheckin,
} from './match-roster';

const ok: RosterCheckin = { score: 88, zone: 'green', acwr: 1.0, painBlocked: false, painZone: null };

describe('classifyForMatch', () => {
  it('pain means "not selected until examined", whatever the score', () => {
    const v = classifyForMatch({ ...ok, painBlocked: true, painZone: ' knee ', zone: 'red', score: 30 });
    expect(v.group).toBe('out');
    expect(v.reasons[0]).toEqual({ code: 'PAIN', zone: 'knee' });
  });

  it('red readiness or a load spike means "available with reduced load"', () => {
    expect(classifyForMatch({ ...ok, zone: 'red', score: 42 })).toEqual({
      group: 'limited',
      reasons: [{ code: 'LOW_READINESS', score: 42 }],
    });
    expect(classifyForMatch({ ...ok, acwr: 1.6 })).toEqual({
      group: 'limited',
      reasons: [{ code: 'LOAD_SPIKE', acwr: 1.6 }],
    });
  });

  it('lists every reason that applies', () => {
    const v = classifyForMatch({ ...ok, zone: 'red', score: 7, acwr: 2.03 });
    expect(v.reasons).toEqual([
      { code: 'LOW_READINESS', score: 7 },
      { code: 'LOAD_SPIKE', acwr: 2.03 },
    ]);
  });

  it('a spike of exactly 1.5 is not a spike (same rule as the engine)', () => {
    expect(classifyForMatch({ ...ok, acwr: 1.5 }).group).toBe('available');
  });

  it('green and yellow zones are available', () => {
    expect(classifyForMatch(ok)).toEqual({ group: 'available', reasons: [{ code: 'OK', score: 88 }] });
    expect(classifyForMatch({ ...ok, zone: 'yellow', score: 60 }).group).toBe('available');
  });

  it('no check-in, or a check-in without a computed score, is never green', () => {
    expect(classifyForMatch(null)).toEqual({ group: 'unknown', reasons: [{ code: 'NO_CHECKIN' }] });
    expect(classifyForMatch({ ...ok, zone: null, score: null }).group).toBe('unknown');
  });
});

describe('buildMatchRoster', () => {
  it('groups the team, counts each athlete once and sorts names', () => {
    const players = [
      { id: 'd', label: 'Dace' },
      { id: 'a', label: 'Anna' },
      { id: 'b', label: 'Bruno' },
      { id: 'a', label: 'Anna' }, // same athlete in a second team
      { id: 'c', label: 'Cēsis' },
    ];
    const checkins = new Map<string, RosterCheckin>([
      ['a', ok],
      ['b', { ...ok, painBlocked: true }],
      ['d', { ...ok, zone: 'red', score: 30 }],
    ]);
    const r = buildMatchRoster(players, checkins);
    expect(r.total).toBe(4);
    expect(r.groups.available.map((x) => x.id)).toEqual(['a']);
    expect(r.groups.out.map((x) => x.id)).toEqual(['b']);
    expect(r.groups.limited.map((x) => x.id)).toEqual(['d']);
    expect(r.groups.unknown.map((x) => x.id)).toEqual(['c']);
  });
});

describe('nextTeamMatch', () => {
  it('finds the earliest upcoming match and ignores past or malformed dates', () => {
    expect(nextTeamMatch(['2026-09-20', '2026-10-05', 'soon', '2026-10-02'], '2026-10-01')).toEqual({
      date: '2026-10-02',
      inDays: 1,
    });
    expect(nextTeamMatch(['2026-10-01'], '2026-10-01')).toEqual({ date: '2026-10-01', inDays: 0 });
    expect(nextTeamMatch(['2026-09-01'], '2026-10-01')).toBeNull();
  });
});

describe('rosterShareText', () => {
  it('shares names and groups only — no health details leave the app', () => {
    const r = buildMatchRoster(
      [
        { id: 'a', label: 'Anna' },
        { id: 'b', label: 'Bruno' },
      ],
      new Map<string, RosterCheckin>([
        ['a', ok],
        ['b', { ...ok, painBlocked: true, painZone: 'knee', score: 30, zone: 'red' }],
      ])
    );
    const text = rosterShareText(r, {
      header: 'Squad for 2 Oct',
      groups: { available: 'Available', limited: 'Reduced load', out: 'Not selected', unknown: 'No check-in' },
    });
    expect(text).toBe('Squad for 2 Oct\n🟢 Available: Anna\n🔴 Not selected: Bruno');
    expect(text.includes('knee')).toBe(false);
    expect(text.includes('30')).toBe(false);
  });
});
