// lib/coach-alerts.ts
//
// Coach alerts (supabase/sql/10_coach_alerts.sql): the database raises a row
// in `coach_alerts` when the engine finds pain or a red zone on a check-in.
// The coach gets it live on /coach (Supabase Realtime, with polling as the
// fallback) and answers with one tap; the athlete sees that answer.
//
// Pure functions only — no Supabase, no React, no audio. Unit-tested in
// coach-alerts.test.ts.
//
// Rules the UI relies on:
//   - one card per athlete and day, however many rows the day produced
//     (re-submitted check-in, training logged later);
//   - pain before red zone, then newest first;
//   - an answered alert is final; a "cleared" alert (athlete corrected the
//     check-in) no longer asks for anything;
//   - the sound plays only for an alert that ARRIVED while the page was open
//     — never for old ones found on load (shouldRing).

export type AlertKind = 'pain' | 'red';
export type CoachReaction = 'contact' | 'rest' | 'specialist';

export const ALERT_KINDS: readonly AlertKind[] = ['pain', 'red'];
/** Order of the one-tap buttons. */
export const COACH_REACTIONS: readonly CoachReaction[] = ['contact', 'rest', 'specialist'];

/** One row of `coach_alerts`, as the API and Realtime deliver it. */
export type CoachAlert = {
  id: string;
  athlete_id: string;
  checkin_date: string; // YYYY-MM-DD (UTC, like every date in the app)
  kind: AlertKind;
  pain_zone: string | null;
  readiness_score: number | null;
  created_at: string;
  cleared_at: string | null;
  reaction: CoachReaction | null;
  reacted_at: string | null;
  reacted_by: string | null;
};

/** Columns to select — same list everywhere. */
export const ALERT_COLUMNS =
  'id, athlete_id, checkin_date, kind, pain_zone, readiness_score, created_at, cleared_at, reaction, reacted_at, reacted_by';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isAlertKind(v: unknown): v is AlertKind {
  return v === 'pain' || v === 'red';
}
export function isCoachReaction(v: unknown): v is CoachReaction {
  return v === 'contact' || v === 'rest' || v === 'specialist';
}
function strOrNull(v: unknown): string | null | undefined {
  if (v === null || v === undefined) return null;
  return typeof v === 'string' ? v : undefined;
}

/**
 * Validates one row from Realtime or a select. Anything malformed becomes
 * null and is ignored — a bad payload must never crash the coach screen.
 */
export function parseAlert(raw: unknown): CoachAlert | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.athlete_id !== 'string') return null;
  if (typeof r.checkin_date !== 'string' || !DATE_RE.test(r.checkin_date)) return null;
  if (!isAlertKind(r.kind)) return null;
  if (typeof r.created_at !== 'string') return null;

  const painZone = strOrNull(r.pain_zone);
  const clearedAt = strOrNull(r.cleared_at);
  const reactedAt = strOrNull(r.reacted_at);
  const reactedBy = strOrNull(r.reacted_by);
  if (painZone === undefined || clearedAt === undefined || reactedAt === undefined || reactedBy === undefined) {
    return null;
  }
  const reaction = r.reaction === null || r.reaction === undefined ? null : r.reaction;
  if (reaction !== null && !isCoachReaction(reaction)) return null;

  let score: number | null = null;
  if (typeof r.readiness_score === 'number' && Number.isFinite(r.readiness_score)) score = r.readiness_score;

  return {
    id: r.id,
    athlete_id: r.athlete_id,
    checkin_date: r.checkin_date,
    kind: r.kind,
    pain_zone: painZone?.trim() || null,
    readiness_score: score,
    created_at: r.created_at,
    cleared_at: clearedAt,
    reaction,
    reacted_at: reactedAt,
    reacted_by: reactedBy,
  };
}

export function parseAlerts(rows: readonly unknown[] | null | undefined): CoachAlert[] {
  const out: CoachAlert[] = [];
  for (const row of rows ?? []) {
    const a = parseAlert(row);
    if (a) out.push(a);
  }
  return out;
}

/** Insert or replace by id (Realtime INSERT/UPDATE, poll results, RPC result). */
export function upsertAlerts(list: readonly CoachAlert[], incoming: readonly CoachAlert[]): CoachAlert[] {
  const byId = new Map(list.map((a) => [a.id, a]));
  for (const a of incoming) byId.set(a.id, a);
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function isOpen(a: CoachAlert): boolean {
  return a.cleared_at === null && a.reacted_at === null;
}

/** One card on /coach: an athlete's alerts for one day. */
export type AlertGroup = {
  key: string; // athleteId|date
  athleteId: string;
  date: string;
  /** Most serious kind among the rows shown (pain beats red). */
  kind: AlertKind;
  painZone: string | null;
  score: number | null;
  /** Newest row — the one the reaction is sent for. */
  latestId: string;
  latestAt: string;
  reaction: CoachReaction | null;
  reactedAt: string | null;
};

function groupOf(rows: CoachAlert[]): AlertGroup {
  // rows: same athlete + date, newest first.
  const latest = rows[0];
  const pain = rows.find((r) => r.kind === 'pain');
  const answered = rows.find((r) => r.reaction !== null);
  return {
    key: `${latest.athlete_id}|${latest.checkin_date}`,
    athleteId: latest.athlete_id,
    date: latest.checkin_date,
    kind: pain ? 'pain' : 'red',
    painZone: pain?.pain_zone ?? null,
    score: latest.readiness_score,
    latestId: latest.id,
    latestAt: latest.created_at,
    reaction: answered?.reaction ?? null,
    reactedAt: answered?.reacted_at ?? null,
  };
}

function groupRows(rows: readonly CoachAlert[]): CoachAlert[][] {
  const byKey = new Map<string, CoachAlert[]>();
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const r of sorted) {
    const key = `${r.athlete_id}|${r.checkin_date}`;
    const list = byKey.get(key);
    if (list) list.push(r);
    else byKey.set(key, [r]);
  }
  return [...byKey.values()];
}

function bySeverityThenNewest(a: AlertGroup, b: AlertGroup): number {
  if (a.kind !== b.kind) return a.kind === 'pain' ? -1 : 1;
  return b.latestAt.localeCompare(a.latestAt);
}

/**
 * Cards for the coach. `open` still wait for an answer; `answered` are the
 * day's history (answer shown, no buttons). Only athletes on the roster and
 * dates from `sinceDate` on. Cleared-only days drop out entirely.
 */
export function coachAlertGroups(
  alerts: readonly CoachAlert[],
  rosterIds: ReadonlySet<string>,
  sinceDate: string
): { open: AlertGroup[]; answered: AlertGroup[] } {
  const relevant = alerts.filter((a) => rosterIds.has(a.athlete_id) && a.checkin_date >= sinceDate);
  const open: AlertGroup[] = [];
  const answered: AlertGroup[] = [];
  for (const rows of groupRows(relevant)) {
    const openRows = rows.filter(isOpen);
    if (openRows.length > 0) {
      open.push(groupOf(openRows));
      continue;
    }
    const answeredRows = rows.filter((r) => r.reaction !== null);
    if (answeredRows.length > 0) answered.push(groupOf(answeredRows));
  }
  open.sort(bySeverityThenNewest);
  answered.sort((a, b) => (b.reactedAt ?? '').localeCompare(a.reactedAt ?? ''));
  return { open, answered };
}

/**
 * Should this incoming row ring? Only a NEW open alert — an id the page has
 * not seen yet. The caller seeds `knownIds` with everything found on the
 * first load, so old alerts stay silent; updates of known rows (answer,
 * cleared) stay silent too. No clock comparison: the phone's clock may be
 * off by minutes, the set of known ids is not.
 */
export function shouldRing(alert: CoachAlert, knownIds: ReadonlySet<string>): boolean {
  return !knownIds.has(alert.id) && isOpen(alert);
}

/** What the athlete sees about today's alert. */
export type AthleteAlertStatus =
  | { state: 'none' }
  | { state: 'waiting'; kind: AlertKind }
  | { state: 'answered'; kind: AlertKind; reaction: CoachReaction; reactedAt: string };

/**
 * Athlete side: the latest signal for `date`. An answer wins over a newer
 * open row only if nothing new is waiting — a re-submitted pain check-in
 * after the answer is a new signal and shows "waiting" again.
 */
export function athleteAlertStatus(alerts: readonly CoachAlert[], athleteId: string, date: string): AthleteAlertStatus {
  const rows = alerts
    .filter((a) => a.athlete_id === athleteId && a.checkin_date === date && a.cleared_at === null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = rows[0];
  if (!latest) return { state: 'none' };
  if (latest.reaction !== null && latest.reacted_at !== null) {
    return { state: 'answered', kind: latest.kind, reaction: latest.reaction, reactedAt: latest.reacted_at };
  }
  return { state: 'waiting', kind: latest.kind };
}
