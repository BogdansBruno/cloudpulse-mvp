// lib/checkin-streak.ts
//
// Check-in streaks and "X of Y checked in today". Pure functions, no
// Supabase and no React, so they run in unit tests.
//
// What a streak counts: days on which the athlete submitted a check-in.
// Nothing else. The score and zone never matter, so an honest "I feel bad"
// counts exactly as much as a green day. A streak that rewarded good scores
// would teach teenagers to fake their answers, and then the engine would be
// reading made-up numbers.
//
// This is NOT the engine's trainingStreak (days in a row WITHOUT rest), which
// is a risk factor and is penalised after 6 days. The two must never share an
// icon or a label in the UI.
//
// Dates are 'YYYY-MM-DD' in UTC, the same convention /api/checkin uses when it
// stores checkins.date, so "today" here and "today" in the database agree.

const DAY_MS = 86_400_000;

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export type CheckinStreak = {
  /** Consecutive check-in days ending today, or ending yesterday if today is still open. */
  current: number;
  /** Longest run anywhere in the dates given. */
  best: number;
  /** Whether today already has a check-in. */
  doneToday: boolean;
};

/**
 * A streak stays alive until the end of the day: if today has no check-in
 * yet, the run that ended yesterday still counts. It only drops to 0 once a
 * whole day has passed with no check-in. Future dates are ignored.
 */
export function computeCheckinStreak(dates: readonly string[], today: string): CheckinStreak {
  const days = new Set(dates.filter((d) => d <= today));
  const doneToday = days.has(today);

  let current = 0;
  let cursor = doneToday ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...days].sort()) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  return { current, best, doneToday };
}

/** Oldest → newest list of the last `count` days with a done/missed flag, for the dot strip. */
export function recentDays(
  dates: readonly string[],
  today: string,
  count = 14
): { date: string; done: boolean }[] {
  const days = new Set(dates);
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - count + 1);
    return { date, done: days.has(date) };
  });
}

export type TeamCheckinSummary = {
  done: number;
  total: number;
  /** Athlete ids with no check-in today, in roster order. */
  missing: string[];
};

/** Roster may list one athlete twice (two teams under one coach); each person counts once. */
export function teamCheckinSummary(
  rosterIds: readonly string[],
  rows: readonly { user_id: string; date: string }[],
  today: string
): TeamCheckinSummary {
  const unique = [...new Set(rosterIds)];
  const doneIds = new Set(rows.filter((r) => r.date === today).map((r) => r.user_id));
  const missing = unique.filter((id) => !doneIds.has(id));
  return { done: unique.length - missing.length, total: unique.length, missing };
}

/** Groups (user_id, date) rows into per-athlete date lists. */
export function datesByAthlete(rows: readonly { user_id: string; date: string }[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const r of rows) {
    const list = out.get(r.user_id);
    if (list) list.push(r.date);
    else out.set(r.user_id, [r.date]);
  }
  return out;
}
