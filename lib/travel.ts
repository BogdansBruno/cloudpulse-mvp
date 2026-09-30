// lib/travel.ts
//
// "After the away trip": the coach marks an away match with the hours spent
// travelling (there and back). CloudPulse does not track location (GDPR) —
// the coach knows the trip, so the coach enters it.
//
// From TRAVEL_MIN_HOURS on (about 150 km each way by bus) the 48 hours after
// returning — the return day and the next day — are recovery days:
//   - the athlete's AI coach plan allows only easy work (reason POST_TRAVEL);
//   - the athlete can show the teacher a signed note (lib/travel-note.ts)
//     asking to consider moving oral answers by a day — the teacher decides;
//   - the coach sees a reminder: first session back — mobility and easy work.
// No medical claims: it is about lost sleep and long sitting, nothing more.
// Pure functions; unit-tested in travel.test.ts.

import { addDays } from './checkin-streak';

export const TRAVEL_MIN_HOURS = 4;
export const TRAVEL_RECOVERY_DAYS = 2;
export const TRAVEL_MAX_HOURS = 48;

export type Trip = {
  id: string;
  title: string;
  matchDate: string;
  returnDate: string;
  travelHours: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTrips(rows: readonly unknown[] | null | undefined): Trip[] {
  const out: Trip[] = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.title !== 'string') continue;
    if (typeof r.match_date !== 'string' || !DATE_RE.test(r.match_date)) continue;
    if (typeof r.return_date !== 'string' || !DATE_RE.test(r.return_date)) continue;
    const h = Number(r.travel_hours);
    if (!Number.isInteger(h) || h < 1 || h > TRAVEL_MAX_HOURS) continue;
    out.push({ id: r.id, title: r.title, matchDate: r.match_date, returnDate: r.return_date, travelHours: h });
  }
  return out.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
}

export function isLongTrip(t: Pick<Trip, 'travelHours'>): boolean {
  return t.travelHours >= TRAVEL_MIN_HOURS;
}

/** Last recovery day (inclusive). */
export function recoveryUntil(t: Pick<Trip, 'returnDate'>): string {
  return addDays(t.returnDate, TRAVEL_RECOVERY_DAYS - 1);
}

export type ActiveTravel = { trip: Trip; day: number; until: string };

/** The long trip whose recovery window covers today (latest return first), or null. */
export function activeTravel(trips: readonly Trip[], today: string): ActiveTravel | null {
  const hits = trips
    .filter((t) => isLongTrip(t) && today >= t.returnDate && today <= recoveryUntil(t))
    .sort((a, b) => b.returnDate.localeCompare(a.returnDate));
  const t = hits[0];
  if (!t) return null;
  const day = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${t.returnDate}T00:00:00Z`)) / 86_400_000) + 1;
  return { trip: t, day, until: recoveryUntil(t) };
}

export type TripInput = { title: string; matchDate: string; returnDate: string; travelHours: number };
export type TripError = 'TITLE' | 'MATCH_DATE' | 'RETURN_DATE' | 'HOURS';

export function validateTrip(input: TripInput): TripError[] {
  const errors: TripError[] = [];
  const title = input.title.trim();
  if (title.length < 1 || title.length > 60) errors.push('TITLE');
  if (!DATE_RE.test(input.matchDate)) errors.push('MATCH_DATE');
  if (
    !DATE_RE.test(input.returnDate) ||
    (DATE_RE.test(input.matchDate) && (input.returnDate < input.matchDate || input.returnDate > addDays(input.matchDate, 7)))
  )
    errors.push('RETURN_DATE');
  if (!Number.isInteger(input.travelHours) || input.travelHours < 1 || input.travelHours > TRAVEL_MAX_HOURS) errors.push('HOURS');
  return errors;
}
