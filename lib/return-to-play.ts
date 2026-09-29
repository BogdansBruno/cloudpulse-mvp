// lib/return-to-play.ts
//
// Return-to-Play (roadmap item 10): what happens AFTER a check-in with pain.
//
//   restricted — pain in the last 28 days and fewer than 2 check-in days
//                without pain since then. The Safety Pass stays restricted,
//                the match squad lists the athlete as "not selected".
//   ready      — 2 check-in days without pain since the last pain. Full load
//                still waits for ONE thing: the coach confirms it.
//   cleared    — the coach confirmed full load for that pain episode.
//
// A new pain report starts a new episode (the episode is identified by the
// date of the latest pain). Days without a check-in do not count as "no pain":
// no data is not good news.
//
// Follow-up questions ("переспрос") on day +1 and day +3 after the pain:
// how it feels compared to the day of pain, and whether a doctor, school nurse
// or physio has seen it. Answers go to the coach; the app draws no medical
// conclusion from them.
//
// This is NOT a medical clearance and says so on every screen. The same rules
// are enforced in the database (supabase/sql/11_return_to_play.sql) — the
// coach cannot confirm before 2 clean days, whatever the browser sends.
//
// Pure functions only; unit-tested in return-to-play.test.ts.

import { addDays } from './checkin-streak';

export const RTP_CLEAN_DAYS_REQUIRED = 2;
export const RTP_LOOKBACK_DAYS = 28;
export const RTP_FOLLOWUP_DAYS = [1, 3] as const;
export type RtpFollowupDay = (typeof RTP_FOLLOWUP_DAYS)[number];

export type RtpTrend = 'better' | 'same' | 'worse';
export const RTP_TRENDS: readonly RtpTrend[] = ['better', 'same', 'worse'];

/** The check-in columns RTP needs. */
export type RtpCheckin = { date: string; painFlag: boolean; painZone: string | null };

export type RtpClearance = { painDate: string; clearedAt: string };

export type RtpFollowup = {
  painDate: string;
  dayOffset: RtpFollowupDay;
  trend: RtpTrend;
  sawSpecialist: boolean;
  answeredAt: string;
};

export type RtpState = 'restricted' | 'ready' | 'cleared';

export type RtpStatus =
  | { state: 'none' }
  | {
      state: RtpState;
      painDate: string;
      painZone: string | null;
      /** Check-in days without pain after painDate (never more than today). */
      cleanDays: number;
      clearedAt: string | null;
      /** Answers for THIS episode, day 1 first. */
      followups: RtpFollowup[];
      /** Question the athlete should answer now, or null. */
      dueFollowup: RtpFollowupDay | null;
    };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function returnToPlayStatus(
  checkins: readonly RtpCheckin[],
  clearances: readonly RtpClearance[],
  followups: readonly RtpFollowup[],
  today: string
): RtpStatus {
  const since = addDays(today, -RTP_LOOKBACK_DAYS);
  const recent = checkins.filter((c) => DATE_RE.test(c.date) && c.date >= since && c.date <= today);

  let pain: RtpCheckin | null = null;
  for (const c of recent) {
    if (c.painFlag && (!pain || c.date > pain.date)) pain = c;
  }
  if (!pain) return { state: 'none' };
  const painDate = pain.date;

  const cleanDates = new Set(recent.filter((c) => c.date > painDate && !c.painFlag).map((c) => c.date));
  const cleanDays = cleanDates.size;

  const clearance = clearances.find((c) => c.painDate === painDate) ?? null;
  const state: RtpState = clearance
    ? 'cleared'
    : cleanDays >= RTP_CLEAN_DAYS_REQUIRED
      ? 'ready'
      : 'restricted';

  const episodeFollowups = followups
    .filter((f) => f.painDate === painDate)
    .sort((a, b) => a.dayOffset - b.dayOffset);

  return {
    state,
    painDate,
    painZone: pain.painZone?.trim() || null,
    cleanDays,
    clearedAt: clearance?.clearedAt ?? null,
    followups: episodeFollowups,
    dueFollowup: state === 'cleared' ? null : dueFollowup(painDate, episodeFollowups, today),
  };
}

/**
 * The follow-up to ask today: the latest one whose day has come, unless it is
 * already answered. Someone who first opens the app on day 4 gets only the
 * day-3 question — not two questionnaires in a row.
 */
export function dueFollowup(
  painDate: string,
  answered: readonly Pick<RtpFollowup, 'dayOffset'>[],
  today: string
): RtpFollowupDay | null {
  let latest: RtpFollowupDay | null = null;
  for (const d of RTP_FOLLOWUP_DAYS) {
    if (today >= addDays(painDate, d)) latest = d;
  }
  if (latest === null) return null;
  const answeredLatest = answered.some((a) => a.dayOffset >= latest);
  return answeredLatest ? null : latest;
}

/** Days since the pain (0 = the pain was today). */
export function daysSince(painDate: string, today: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${painDate}T00:00:00Z`)) / 86_400_000);
}

/** For the match squad and the pass: only the open states matter. */
export type OpenRtp = { state: 'restricted' | 'ready'; cleanDays: number; painDate: string };

export function openRtp(status: RtpStatus): OpenRtp | null {
  if (status.state === 'restricted' || status.state === 'ready') {
    return { state: status.state, cleanDays: status.cleanDays, painDate: status.painDate };
  }
  return null;
}

// --- parsing rows from Supabase -------------------------------------------------

function isTrend(v: unknown): v is RtpTrend {
  return v === 'better' || v === 'same' || v === 'worse';
}

export function parseFollowups(rows: readonly unknown[] | null | undefined): (RtpFollowup & { athleteId: string })[] {
  const out: (RtpFollowup & { athleteId: string })[] = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.athlete_id !== 'string' || typeof r.pain_date !== 'string' || !DATE_RE.test(r.pain_date)) continue;
    if (r.day_offset !== 1 && r.day_offset !== 3) continue;
    if (!isTrend(r.trend) || typeof r.saw_specialist !== 'boolean' || typeof r.answered_at !== 'string') continue;
    out.push({
      athleteId: r.athlete_id,
      painDate: r.pain_date,
      dayOffset: r.day_offset,
      trend: r.trend,
      sawSpecialist: r.saw_specialist,
      answeredAt: r.answered_at,
    });
  }
  return out;
}

export function parseClearances(rows: readonly unknown[] | null | undefined): (RtpClearance & { athleteId: string })[] {
  const out: (RtpClearance & { athleteId: string })[] = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.athlete_id !== 'string' || typeof r.pain_date !== 'string' || !DATE_RE.test(r.pain_date)) continue;
    if (typeof r.cleared_at !== 'string') continue;
    out.push({ athleteId: r.athlete_id, painDate: r.pain_date, clearedAt: r.cleared_at });
  }
  return out;
}

export function parseRtpCheckins(rows: readonly unknown[] | null | undefined): (RtpCheckin & { userId: string })[] {
  const out: (RtpCheckin & { userId: string })[] = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.user_id !== 'string' || typeof r.date !== 'string' || !DATE_RE.test(r.date)) continue;
    out.push({
      userId: r.user_id,
      date: r.date,
      painFlag: r.pain_flag === true,
      painZone: typeof r.pain_zone === 'string' ? r.pain_zone : null,
    });
  }
  return out;
}

/** Group rows by athlete and compute everyone's status in one go (coach view). */
export function rtpByAthlete(
  athleteIds: readonly string[],
  checkins: readonly (RtpCheckin & { userId: string })[],
  clearances: readonly (RtpClearance & { athleteId: string })[],
  followups: readonly (RtpFollowup & { athleteId: string })[],
  today: string
): Map<string, RtpStatus> {
  const out = new Map<string, RtpStatus>();
  for (const id of athleteIds) {
    out.set(
      id,
      returnToPlayStatus(
        checkins.filter((c) => c.userId === id),
        clearances.filter((c) => c.athleteId === id),
        followups.filter((f) => f.athleteId === id),
        today
      )
    );
  }
  return out;
}
