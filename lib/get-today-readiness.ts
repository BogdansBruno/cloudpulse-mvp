import { createUserScopedClient } from './supabase-server';
import { loadDevStore } from './dev-store';
import {
  calculateReadiness,
  detectSafetyViolations,
  type SessionEntry,
  type DailyCheckin,
  type UserContext,
  type ReadinessResult,
  type SafetyViolation,
} from './readiness-engine';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type DbCheckinRow = {
  date: string;
  sleep_quality: number;
  stress: number;
  fatigue: number;
  soreness: number;
  pain_flag: boolean;
  pain_zone: string | null;
};

type DbSessionRow = { date: string; rpe: number; duration_minutes: number };

function rowsToCheckins(rows: DbCheckinRow[]): DailyCheckin[] {
  return rows.map((r) => ({
    date: r.date,
    sleepQuality: r.sleep_quality,
    stress: r.stress,
    fatigue: r.fatigue,
    soreness: r.soreness,
    painFlag: r.pain_flag,
    painZone: r.pain_zone ?? undefined,
  }));
}

function rowsToSessions(rows: DbSessionRow[]): SessionEntry[] {
  return rows.map((r) => ({ date: r.date, rpe: r.rpe, durationMinutes: r.duration_minutes }));
}

export type TodayReadiness = {
  hasCheckin: boolean;
  date: string;
  readiness: ReadinessResult;
  safetyViolations: SafetyViolation[];
};

/**
 * Single source of truth for "what does the deterministic engine say about
 * this user RIGHT NOW". Used by both /api/checkin (to show the result after
 * a submit) and /api/chat (so Claude gets the same numbers as ground truth
 * instead of chatting blind). Mirrors the data-fetching in
 * app/api/checkin/route.ts exactly — keep the two in sync if the schema
 * changes.
 */
export async function getTodayReadiness(opts: {
  devMode: boolean;
  token: string | null;
  userId: string;
}): Promise<TodayReadiness> {
  const date = todayIso();
  let sessions: SessionEntry[];
  let checkins: DailyCheckin[];
  let context: UserContext;

  if (opts.devMode) {
    const store = loadDevStore();
    sessions = store.sessions;
    checkins = store.checkins;
    context = store.context;
  } else {
    const client = createUserScopedClient(opts.token!);

    const cutoff = new Date(date);
    cutoff.setDate(cutoff.getDate() - 28);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const [sessionsRes, checkinsRes, profileRes] = await Promise.all([
      client
        .from('sessions_log')
        .select('date, rpe, duration_minutes')
        .eq('user_id', opts.userId)
        .gte('date', cutoffStr)
        .lte('date', date),
      client
        .from('checkins')
        .select('date, sleep_quality, stress, fatigue, soreness, pain_flag, pain_zone')
        .eq('user_id', opts.userId)
        .gte('date', cutoffStr)
        .lte('date', date),
      client.from('profiles').select('exam_dates, match_dates').eq('id', opts.userId).maybeSingle(),
    ]);

    if (sessionsRes.error) throw sessionsRes.error;
    if (checkinsRes.error) throw checkinsRes.error;

    sessions = rowsToSessions((sessionsRes.data as DbSessionRow[]) ?? []);
    checkins = rowsToCheckins((checkinsRes.data as DbCheckinRow[]) ?? []);
    context = {
      examDates: profileRes.data?.exam_dates ?? [],
      matchDates: profileRes.data?.match_dates ?? [],
    };
  }

  const readiness = calculateReadiness(sessions, checkins, date, context);
  const todaysCheckin = checkins.find((c) => c.date === date);
  const safetyViolations = detectSafetyViolations(todaysCheckin, date, context);

  return { hasCheckin: Boolean(todaysCheckin), date, readiness, safetyViolations };
}
