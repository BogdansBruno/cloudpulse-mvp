// lib/exam-storm.ts
//
// "Exam storm" (roadmap item 11): the next 14 days of the team, as COUNTS.
//
// For every day: how many athletes are in their exam window — the days the
// Readiness Engine already takes 15 points off for school stress (the exam day
// and the 3 days before it, same rule as lib/readiness-engine.ts and the SQL
// trigger). A "storm" is a day when a third of the team or more is in that
// window (never fewer than 3 athletes). Matches on the team calendar are
// marked, because a match inside a storm is where load planning matters most.
//
// Privacy (roadmap rule 4): no names, and any count of 1 or 2 is shown as
// "fewer than 3" — in a small team an exact small number points at a person.
// The card only counts; what to do about it is the coach's decision.
//
// Pure functions only; unit-tested in exam-storm.test.ts.

import { addDays } from './checkin-streak';

/** Same window as the engine: exam day and the 3 days before it. */
export const EXAM_WINDOW_DAYS = 3;
export const STORM_HORIZON_DAYS = 14;
/** Counts below this are never shown exactly. */
export const MIN_GROUP = 3;

export type StormAthlete = { examDates: readonly string[]; matchDates: readonly string[] };

export type StormDay = {
  date: string;
  /** Athletes in the exam window that day (the engine lowers their score). */
  inWindow: number;
  /** Athletes with an exam ON that day. */
  examsOnDay: number;
  /** Athletes with a match on that day. */
  matches: number;
  storm: boolean;
};

export type StormRange = { from: string; to: string; peak: number };

export type ExamStorm = {
  teamSize: number;
  threshold: number;
  days: StormDay[];
  /** Consecutive storm days merged into ranges, earliest first. */
  storms: StormRange[];
  /** Matches that fall on a storm day. */
  matchesInStorm: string[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDates(list: readonly string[]): string[] {
  return [...new Set(list.filter((d) => DATE_RE.test(d)))];
}

/** Storm threshold: a third of the team, at least MIN_GROUP athletes. */
export function stormThreshold(teamSize: number): number {
  return Math.max(MIN_GROUP, Math.ceil(teamSize / 3));
}

export function examStorm(
  athletes: readonly StormAthlete[],
  today: string,
  horizon: number = STORM_HORIZON_DAYS
): ExamStorm {
  const teamSize = athletes.length;
  const threshold = stormThreshold(teamSize);
  const clean = athletes.map((a) => ({ exams: validDates(a.examDates), matches: validDates(a.matchDates) }));

  const days: StormDay[] = [];
  for (let i = 0; i < horizon; i++) {
    const date = addDays(today, i);
    const windowEnd = addDays(date, EXAM_WINDOW_DAYS);
    let inWindow = 0;
    let examsOnDay = 0;
    let matches = 0;
    for (const a of clean) {
      if (a.exams.some((e) => e >= date && e <= windowEnd)) inWindow++;
      if (a.exams.includes(date)) examsOnDay++;
      if (a.matches.includes(date)) matches++;
    }
    days.push({ date, inWindow, examsOnDay, matches, storm: teamSize > 0 && inWindow >= threshold });
  }

  const storms: StormRange[] = [];
  for (const d of days) {
    const last = storms[storms.length - 1];
    if (!d.storm) continue;
    if (last && addDays(last.to, 1) === d.date) {
      last.to = d.date;
      last.peak = Math.max(last.peak, d.inWindow);
    } else {
      storms.push({ from: d.date, to: d.date, peak: d.inWindow });
    }
  }

  const matchesInStorm = days.filter((d) => d.storm && d.matches > 0).map((d) => d.date);
  return { teamSize, threshold, days, storms, matchesInStorm };
}

/**
 * What the screen may show for a count: 0 and 3+ exactly, 1–2 as "fewer
 * than 3" (the caller renders the label, e.g. "<3").
 */
export function displayCount(n: number): { exact: number } | { fewerThan: number } {
  if (n === 0 || n >= MIN_GROUP) return { exact: n };
  return { fewerThan: MIN_GROUP };
}
