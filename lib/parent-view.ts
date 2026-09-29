// lib/parent-view.ts
//
// Parent screen logic (data from parent_overview(), supabase/sql/13). Pure
// functions only; unit-tested in parent-view.test.ts.
//
// What a parent can get, and only with the athlete's own consent switches:
//   colour consent   → today's colour, the last 7 days' colours, and whether
//                      the coach got today's signal and what he answered;
//   calendar consent → dates of exams and matches (no subjects, no grades).
// Never: scores, wellness answers, pain details, trainings.
//
// Home tips are general and grounded (sleep before exams and matches, no
// extra load on a red day). No numbers, no food or medical advice — with
// pain the only advice is "doctor, school nurse or physio" (roadmap rule 3).

import { addDays } from './checkin-streak';
import { EXAM_WINDOW_DAYS } from './exam-storm';

export type Zone = 'green' | 'yellow' | 'red';
export type CoachReaction = 'contact' | 'rest' | 'specialist';

export type ParentToday = { checkedIn: boolean; zone: Zone | null; restricted: boolean };
export type ParentWeekDay = { date: string; zone: Zone | null; checkedIn: boolean };
export type ParentCoach = { state: 'waiting' | 'answered'; reaction: CoachReaction | null; at: string };
export type ParentCalendar = { exams: string[]; matches: string[] };

export type ParentOverview = {
  linkId: string;
  athleteLabel: string | null;
  consent: boolean;
  calendarConsent: boolean;
  today: ParentToday | null;
  week: ParentWeekDay[] | null;
  coach: ParentCoach | null;
  calendar: ParentCalendar | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isZone(v: unknown): v is Zone {
  return v === 'green' || v === 'yellow' || v === 'red';
}
function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function dates(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((d): d is string => typeof d === 'string' && DATE_RE.test(d)))].sort() : [];
}

/** One row of parent_overview(). Malformed parts become null, never a crash. */
export function parseOverview(raw: unknown): ParentOverview | null {
  const r = obj(raw);
  if (!r || typeof r.link_id !== 'string') return null;

  const t = obj(r.today);
  const today: ParentToday | null = t
    ? { checkedIn: t.checked_in === true, zone: isZone(t.zone) ? t.zone : null, restricted: t.restricted === true }
    : null;

  const week: ParentWeekDay[] | null = Array.isArray(r.week)
    ? r.week.flatMap((d): ParentWeekDay[] => {
        const o = obj(d);
        if (!o || typeof o.date !== 'string' || !DATE_RE.test(o.date)) return [];
        return [{ date: o.date, zone: isZone(o.zone) ? o.zone : null, checkedIn: o.checked_in === true }];
      })
    : null;

  const c = obj(r.coach);
  const coach: ParentCoach | null =
    c && (c.state === 'waiting' || c.state === 'answered') && typeof c.at === 'string'
      ? {
          state: c.state,
          reaction: c.reaction === 'contact' || c.reaction === 'rest' || c.reaction === 'specialist' ? c.reaction : null,
          at: c.at,
        }
      : null;

  const cal = obj(r.calendar);
  const calendar: ParentCalendar | null = cal ? { exams: dates(cal.exams), matches: dates(cal.matches) } : null;

  return {
    linkId: r.link_id,
    athleteLabel: typeof r.athlete_label === 'string' ? r.athlete_label : null,
    consent: r.consent === true,
    calendarConsent: r.calendar_consent === true,
    today,
    week,
    coach,
    calendar,
  };
}

/** Old parent_dashboard() row (before SQL 13): colour of today only. */
export function fromLegacyDashboard(raw: unknown): ParentOverview | null {
  const r = obj(raw);
  if (!r || typeof r.link_id !== 'string') return null;
  const consent = r.consent === true;
  return {
    linkId: r.link_id,
    athleteLabel: typeof r.athlete_label === 'string' ? r.athlete_label : null,
    consent,
    calendarConsent: false,
    today: consent
      ? { checkedIn: r.checked_in === true, zone: isZone(r.zone) ? r.zone : null, restricted: r.restricted === true }
      : null,
    week: null,
    coach: null,
    calendar: null,
  };
}

// --- week -------------------------------------------------------------------

export function weekSummary(week: readonly ParentWeekDay[]): { checkedIn: number; total: number } {
  return { checkedIn: week.filter((d) => d.checkedIn).length, total: week.length };
}

// --- child's calendar -------------------------------------------------------

export type ChildDay = {
  date: string;
  exam: boolean;
  match: boolean;
  /** Exam day or one of the 3 days before it (the engine lowers readiness). */
  examWindow: boolean;
  /** An exam and a match within a day of each other — a heavy stretch. */
  tight: boolean;
};

export function childCalendar(cal: ParentCalendar, today: string, days = 14): ChildDay[] {
  const out: ChildDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const windowEnd = addDays(date, EXAM_WINDOW_DAYS);
    const exam = cal.exams.includes(date);
    const match = cal.matches.includes(date);
    const near = (list: string[]) => list.some((d) => d >= addDays(date, -1) && d <= addDays(date, 1));
    out.push({
      date,
      exam,
      match,
      examWindow: cal.exams.some((e) => e >= date && e <= windowEnd),
      tight: (exam && near(cal.matches)) || (match && near(cal.exams)),
    });
  }
  return out;
}

/** Consecutive "tight" days as ranges, for one readable line each. */
export function tightRanges(days: readonly ChildDay[]): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (const d of days) {
    if (!d.tight) continue;
    const last = out[out.length - 1];
    if (last && addDays(last.to, 1) === d.date) last.to = d.date;
    else out.push({ from: d.date, to: d.date });
  }
  return out;
}

// --- home tips --------------------------------------------------------------

export type TipCode =
  | 'RED_TODAY'
  | 'EXAM_AND_MATCH_CLOSE'
  | 'MATCH_TODAY'
  | 'EXAM_TOMORROW'
  | 'MATCH_TOMORROW'
  | 'BUSY_WEEK';

/**
 * At most 3 tips, most urgent first. Each needs the matching consent: the
 * colour tip only with colour consent, calendar tips only with calendar
 * consent (the caller passes null for what it does not have).
 */
export function homeTips(today: ParentToday | null, cal: ParentCalendar | null, date: string): TipCode[] {
  const tips: TipCode[] = [];
  if (today?.checkedIn && today.zone === 'red') tips.push('RED_TODAY');

  if (cal) {
    const tomorrow = addDays(date, 1);
    const days = childCalendar(cal, date, 3);
    if (days.some((d) => d.tight)) tips.push('EXAM_AND_MATCH_CLOSE');
    if (cal.matches.includes(date)) tips.push('MATCH_TODAY');
    if (cal.exams.includes(tomorrow)) tips.push('EXAM_TOMORROW');
    if (cal.matches.includes(tomorrow)) tips.push('MATCH_TOMORROW');
    const weekEnd = addDays(date, 6);
    if (cal.exams.filter((e) => e >= date && e <= weekEnd).length >= 2) tips.push('BUSY_WEEK');
  }
  return tips.slice(0, 3);
}
