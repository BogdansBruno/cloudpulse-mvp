import { describe, it, expect } from 'vitest';
import { buildWarRoom, filterCards, countFilters, yellowToAsk, statusOf } from './war-room';
import type { RosterCheckin } from './match-roster';

const ci = (over: Partial<RosterCheckin> = {}): RosterCheckin => ({ score: 80, zone: 'green', acwr: 1.0, painBlocked: false, painZone: null, ...over });
const TODAY = '2026-11-02';
const players = [
  { id: 'a', label: 'Anna' },
  { id: 'b', label: 'Boris', examDates: ['2026-11-04'] },
  { id: 'c', label: 'Clara' },
  { id: 'd', label: 'Dan' },
  { id: 'e', label: 'Eva' },
];
const checkins = new Map<string, RosterCheckin>([
  ['a', ci()],
  ['b', ci({ zone: 'yellow', score: 62, acwr: 1.4 })],
  ['c', ci({ zone: 'red', score: 40 })],
  ['d', ci({ painBlocked: true, painZone: ' knee ', zone: 'green' })],
]);

describe('war room', () => {
  const cards = buildWarRoom(players, checkins, TODAY);
  it('sorts problems first: pain, red, yellow, no data, green', () => {
    expect(cards.map((c) => c.id)).toEqual(['d', 'c', 'b', 'e', 'a']);
  });
  it('no check-in is no data, never green', () => {
    expect(statusOf(undefined)).toBe('no_checkin');
    expect(cards.find((c) => c.id === 'e')!.status).toBe('no_checkin');
  });
  it('pain beats the colour and keeps a trimmed zone', () => {
    const d = cards.find((c) => c.id === 'd')!;
    expect(d.status).toBe('pain');
    expect(d.painZone).toBe('knee');
  });
  it('strain: rising load + exam soon = watch', () => {
    const b = cards.find((c) => c.id === 'b')!;
    expect(b.examIn).toBe(2);
    expect(b.strain.level).toBe('watch');
  });
  it('filters and counts', () => {
    expect(filterCards(cards, 'yellow').map((c) => c.id)).toEqual(['b']);
    expect(filterCards(cards, 'strain').map((c) => c.id)).toEqual(['b']);
    expect(countFilters(cards)).toEqual({ all: 5, pain: 1, red: 1, yellow: 1, strain: 1, no_checkin: 1 });
  });
  it('"ask yellow" targets yellow only', () => {
    expect(yellowToAsk(cards).map((c) => c.id)).toEqual(['b']);
  });
  it('duplicates are shown once', () => {
    expect(buildWarRoom([players[0], players[0]], checkins, TODAY).length).toBe(1);
  });
});
