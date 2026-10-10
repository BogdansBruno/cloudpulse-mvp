// lib/war-room.ts
//
// "War Room" for the coach: the whole roster as a tablet grid, built from the
// numbers the Readiness Engine already stored on today's check-ins (score,
// zone, ACWR, pain block) plus the athlete's exam dates. Pure functions, no
// Supabase and no React — unit-tested in war-room.test.ts.
//
// Rules:
//   - no check-in today = "no data", never green;
//   - pain beats every colour; the only advice with pain is "doctor, school
//     nurse or physio" (shown by the page, not decided here);
//   - the overload signal (lib/strain-signal.ts) is computed only from what the
//     coach already sees: ACWR, zone and the exam window;
//   - the batch action is a QUESTION to the yellow athletes, never an order
//     and never a percentage cut: the coach decides what each one does.

import type { RosterCheckin } from './match-roster';
import { examInDays, strainSignal, type StrainSignal } from './strain-signal';

export type WarStatus = 'pain' | 'red' | 'yellow' | 'no_checkin' | 'green';
export type WarFilter = 'all' | 'pain' | 'red' | 'yellow' | 'strain' | 'no_checkin';

export const WAR_FILTERS: readonly WarFilter[] = ['all', 'pain', 'red', 'yellow', 'strain', 'no_checkin'];

export type WarPlayer = { id: string; label: string; examDates?: readonly string[] | null };

export type WarCard = {
  id: string;
  label: string;
  status: WarStatus;
  score: number | null;
  acwr: number | null;
  painZone: string | null;
  /** Days until the nearest exam in the 3-day window, or null. */
  examIn: number | null;
  strain: StrainSignal;
};

const ORDER: Record<WarStatus, number> = { pain: 0, red: 1, yellow: 2, no_checkin: 3, green: 4 };

export function statusOf(c: RosterCheckin | null | undefined): WarStatus {
  if (!c) return 'no_checkin';
  if (c.painBlocked) return 'pain';
  if (c.zone === 'red') return 'red';
  if (c.zone === 'yellow') return 'yellow';
  if (c.zone === 'green') return 'green';
  return 'no_checkin'; // checked in but not computed yet
}

export function buildWarRoom(
  players: readonly WarPlayer[],
  checkins: ReadonlyMap<string, RosterCheckin>,
  today: string
): WarCard[] {
  const seen = new Set<string>();
  const cards: WarCard[] = [];
  for (const p of players) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const c = checkins.get(p.id) ?? null;
    const examIn = examInDays(today, p.examDates);
    const strain = c
      ? strainSignal({ acwr: c.acwr, zone: c.zone, examSoon: examIn !== null })
      : { level: 'none' as const, factors: [], spike: false };
    cards.push({
      id: p.id,
      label: p.label,
      status: statusOf(c),
      score: c?.score ?? null,
      acwr: c?.acwr ?? null,
      painZone: c?.painBlocked ? (c.painZone?.trim() || null) : null,
      examIn,
      strain,
    });
  }
  return cards.sort(
    (a, b) =>
      ORDER[a.status] - ORDER[b.status] ||
      (b.strain.level === 'high' ? 1 : 0) - (a.strain.level === 'high' ? 1 : 0) ||
      a.label.localeCompare(b.label)
  );
}

export function matchesFilter(c: WarCard, f: WarFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'strain':
      return c.strain.level !== 'none';
    default:
      return c.status === f;
  }
}

export function filterCards(cards: readonly WarCard[], f: WarFilter): WarCard[] {
  return cards.filter((c) => matchesFilter(c, f));
}

export function countFilters(cards: readonly WarCard[]): Record<WarFilter, number> {
  const out = {} as Record<WarFilter, number>;
  for (const f of WAR_FILTERS) out[f] = cards.filter((c) => matchesFilter(c, f)).length;
  return out;
}

/** Who the "ask all yellow" button is for: yellow zone, no pain (pain goes to a person, not a template). */
export function yellowToAsk(cards: readonly WarCard[]): WarCard[] {
  return cards.filter((c) => c.status === 'yellow');
}
