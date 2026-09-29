// lib/match-roster.ts
//
// "Match roster" for the coach: the whole team in four groups, from the
// numbers the Readiness Engine already stored on today's check-ins. Pure
// functions, no Supabase, no React — unit-tested in match-roster.test.ts.
//
//   out       — pain reported today. Not selected until a doctor, nurse or
//               physio has looked at it (the engine's PAIN_REPORTED block).
//   limited   — available, but load should be reduced: readiness in the red
//               zone, or a load spike (ACWR > 1.5).
//   unknown   — no check-in today. Never shown as green: no data is not
//               good news.
//
// Return-to-Play (lib/return-to-play.ts) after a recent pain:
//   still restricted (< 2 check-in days without pain) → out, even if today
//   looks fine; 2 clean days but no coach confirmation yet → limited.
//   available — checked in, no pain, no red zone, no spike.
//
// MATCH_DAY / PRE_MATCH / POST_MATCH are deliberately ignored here: they
// limit the TYPE of training around a match, not whether a player can play.
//
// This is a suggestion from the engine. The coach picks the team.

import type { OpenRtp } from './return-to-play';

export type RosterZone = 'green' | 'yellow' | 'red';

/** The computed columns of today's `checkins` row that the roster needs. */
export type RosterCheckin = {
  score: number | null;
  zone: RosterZone | null;
  acwr: number | null;
  painBlocked: boolean;
  painZone: string | null;
};

export type RosterGroup = 'out' | 'limited' | 'unknown' | 'available';

/** Display order: problems first, so nothing urgent is below the fold. */
export const ROSTER_GROUPS: readonly RosterGroup[] = ['out', 'limited', 'unknown', 'available'];

export type RosterReason =
  | { code: 'PAIN'; zone: string | null }
  | { code: 'LOW_READINESS'; score: number | null }
  | { code: 'LOAD_SPIKE'; acwr: number }
  | { code: 'RTP_RESTRICTED'; cleanDays: number; required: number }
  | { code: 'RTP_AWAITING' }
  | { code: 'NO_CHECKIN' }
  | { code: 'NOT_COMPUTED' }
  | { code: 'OK'; score: number | null };

/** Same threshold the engine uses for a load spike (lib/readiness-engine.ts). */
export const ACWR_SPIKE = 1.5;

export type RosterVerdict = { group: RosterGroup; reasons: RosterReason[] };

/** Clean days Return-to-Play asks for (same number as lib/return-to-play.ts). */
const RTP_REQUIRED = 2;

/** One athlete's group, with every reason that applies (most serious first). */
export function classifyForMatch(checkin: RosterCheckin | null, rtp: OpenRtp | null = null): RosterVerdict {
  // Pain today is the strongest reason; Return-to-Play adds nothing to it.
  if (checkin?.painBlocked) {
    const reasons: RosterReason[] = [{ code: 'PAIN', zone: checkin.painZone?.trim() || null }];
    if (checkin.acwr !== null && checkin.acwr > ACWR_SPIKE) reasons.push({ code: 'LOAD_SPIKE', acwr: checkin.acwr });
    return { group: 'out', reasons };
  }

  const load: RosterReason[] = [];
  if (checkin && checkin.zone === 'red') load.push({ code: 'LOW_READINESS', score: checkin.score });
  if (checkin && checkin.acwr !== null && checkin.acwr > ACWR_SPIKE) load.push({ code: 'LOAD_SPIKE', acwr: checkin.acwr });

  if (rtp?.state === 'restricted') {
    return {
      group: 'out',
      reasons: [{ code: 'RTP_RESTRICTED', cleanDays: rtp.cleanDays, required: RTP_REQUIRED }, ...load],
    };
  }

  if (!checkin) {
    const reasons: RosterReason[] = [{ code: 'NO_CHECKIN' }];
    if (rtp?.state === 'ready') reasons.push({ code: 'RTP_AWAITING' });
    return { group: 'unknown', reasons };
  }

  const reasons = [...load];
  if (rtp?.state === 'ready') reasons.push({ code: 'RTP_AWAITING' });
  if (reasons.length > 0) return { group: 'limited', reasons };
  if (checkin.zone === null) return { group: 'unknown', reasons: [{ code: 'NOT_COMPUTED' }] };
  return { group: 'available', reasons: [{ code: 'OK', score: checkin.score }] };
}

export type RosterPlayer = { id: string; label: string };
export type RosterRow = RosterPlayer & RosterVerdict;
export type MatchRoster = { groups: Record<RosterGroup, RosterRow[]>; total: number };

/** Groups the team; each athlete appears once, names sorted within a group. */
export function buildMatchRoster(
  players: readonly RosterPlayer[],
  checkins: ReadonlyMap<string, RosterCheckin>,
  rtp: ReadonlyMap<string, OpenRtp> = new Map()
): MatchRoster {
  const groups: Record<RosterGroup, RosterRow[]> = { out: [], limited: [], unknown: [], available: [] };
  const seen = new Set<string>();
  for (const p of players) {
    if (seen.has(p.id)) continue; // same athlete in two of the coach's teams
    seen.add(p.id);
    const verdict = classifyForMatch(checkins.get(p.id) ?? null, rtp.get(p.id) ?? null);
    groups[verdict.group].push({ ...p, ...verdict });
  }
  for (const g of ROSTER_GROUPS) groups[g].sort((a, b) => a.label.localeCompare(b.label));
  return { groups, total: seen.size };
}

/** Earliest match on or after today across the team's calendars, or null. */
export function nextTeamMatch(
  matchDates: readonly string[],
  today: string
): { date: string; inDays: number } | null {
  const upcoming = matchDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today).sort();
  const date = upcoming[0];
  if (!date) return null;
  const inDays = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return { date, inDays };
}

export type ShareLabels = {
  header: string;
  groups: Record<RosterGroup, string>;
};

/**
 * Plain text the coach can paste into the team chat. Names and groups only:
 * no pain location, scores or other health details leave the app this way.
 */
export function rosterShareText(roster: MatchRoster, labels: ShareLabels): string {
  const icon: Record<RosterGroup, string> = { available: '🟢', limited: '🟡', out: '🔴', unknown: '⚪' };
  const order: RosterGroup[] = ['available', 'limited', 'out', 'unknown'];
  const lines = [labels.header];
  for (const g of order) {
    const names = roster.groups[g].map((r) => r.label);
    if (names.length > 0) lines.push(`${icon[g]} ${labels.groups[g]}: ${names.join(', ')}`);
  }
  return lines.join('\n');
}
