// lib/team-pulse.ts
//
// "Team pulse" for the coach: how the TEAM feels today, from the check-in
// scales (stress, sleep, fatigue, soreness — 1..7, 7 = best), never who.
//
// The database function team_pulse() (supabase/sql/15) does the counting, so
// individual answers never reach this screen. It already hides small groups:
//   - fewer than 3 check-ins that day → every count is null;
//   - a count of 1 or 2 → -1 ("fewer than 3").
//
// What it measures, honestly: load and school stress as the athletes report
// them. It does NOT measure "toxic atmosphere" or mood — the check-in has no
// such question, and the card says only what the numbers say.
//
// The suggestion is an option for the coach, never an order.
// Pure functions; unit-tested in team-pulse.test.ts.

/** A scale answer this low (of 7) counts as "high stress" / "poor sleep" etc. */
export const PULSE_FLAG_MAX = 2;
export const PULSE_MIN_GROUP = 3;

/** number = exact count; 'fewer' = 1 or 2 (hidden); null = too few check-ins to count. */
export type PulseCount = number | 'fewer' | null;

export type PulseDay = {
  date: string;
  teamSize: number;
  checkedIn: number;
  stressHigh: PulseCount;
  sleepPoor: PulseCount;
  fatigueHigh: PulseCount;
  sorenessHigh: PulseCount;
  /** Stress OR sleep flagged — the "school / life strain" signal. */
  strained: PulseCount;
};

export type PulseLevel = 'too_few' | 'calm' | 'watch' | 'high';
export type PulseTrend = 'higher' | 'same' | 'lower';
export type PulseSuggestion = 'LIGHTER_OR_GAME' | 'SHORT_TALK' | 'EXAMS_AHEAD';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function count(v: unknown): PulseCount {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n === -1) return 'fewer';
  return n >= 0 ? Math.round(n) : null;
}

/** Rows of team_pulse(); malformed rows are dropped. Sorted by date. */
export function parsePulse(rows: readonly unknown[] | null | undefined): PulseDay[] {
  const out: PulseDay[] = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.day !== 'string' || !DATE_RE.test(r.day)) continue;
    out.push({
      date: r.day,
      teamSize: Number(r.team_size) || 0,
      checkedIn: Number(r.checked_in) || 0,
      stressHigh: count(r.stress_high),
      sleepPoor: count(r.sleep_poor),
      fatigueHigh: count(r.fatigue_high),
      sorenessHigh: count(r.soreness_high),
      strained: count(r.strained),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** "Watch": a third of those who checked in are strained; "high": half. Never fewer than 3 people. */
export function pulseLevel(day: PulseDay): PulseLevel {
  if (day.checkedIn < PULSE_MIN_GROUP || day.strained === null) return 'too_few';
  const strained = day.strained === 'fewer' ? 0 : day.strained;
  if (strained >= Math.max(PULSE_MIN_GROUP, Math.ceil(day.checkedIn / 2))) return 'high';
  if (strained >= Math.max(PULSE_MIN_GROUP, Math.ceil(day.checkedIn / 3))) return 'watch';
  return 'calm';
}

/** Share of strained athletes; 'fewer' counts as 1.5 (the middle of 1–2). */
function share(day: PulseDay): number | null {
  if (day.checkedIn < PULSE_MIN_GROUP || day.strained === null) return null;
  const n = day.strained === 'fewer' ? 1.5 : day.strained;
  return n / day.checkedIn;
}

/**
 * Today against the team's own recent days (not against other teams).
 * Needs at least 3 earlier days with enough check-ins; otherwise null.
 */
export function pulseTrend(days: readonly PulseDay[], today: string): PulseTrend | null {
  const t = days.find((d) => d.date === today);
  const now = t ? share(t) : null;
  if (now === null) return null;
  const before = days.filter((d) => d.date < today).map(share).filter((s): s is number => s !== null);
  if (before.length < 3) return null;
  const avg = before.reduce((a, b) => a + b, 0) / before.length;
  if (now - avg >= 0.2) return 'higher';
  if (avg - now >= 0.2) return 'lower';
  return 'same';
}

/** Options for the coach (at most 2), most relevant first. */
export function pulseSuggestions(level: PulseLevel, examWindowToday: number): PulseSuggestion[] {
  const out: PulseSuggestion[] = [];
  if (level === 'high') out.push('LIGHTER_OR_GAME');
  if (level === 'watch' || level === 'high') out.push('SHORT_TALK');
  if (examWindowToday >= PULSE_MIN_GROUP && (level === 'watch' || level === 'high')) out.push('EXAMS_AHEAD');
  return out.slice(0, 2);
}
