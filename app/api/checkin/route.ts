import { NextResponse } from 'next/server';
import { getUserFromToken, createUserScopedClient } from '@/lib/supabase-server';
import { loadDevStore, saveDevStore } from '@/lib/dev-store';
import {
  calculateReadiness,
  detectSafetyViolations,
  type SessionEntry,
  type DailyCheckin,
  type UserContext,
} from '@/lib/readiness-engine';
import { isAcceptableCheckinDate } from '@/lib/offline-queue';
import { parseSorenessZones, toSorenessRows, type SorenessZone } from '@/adp/src/types/sportProfile';

export const runtime = 'nodejs';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidScale(v: unknown): v is number {
  return typeof v === 'number' && v >= 1 && v <= 7;
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

// POST /api/checkin — submit today's (or a given date's) check-in,
// optionally logging a training session in the same call, and return the
// freshly computed Readiness Score + any Safety Guard violations.
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = await getUserFromToken(token);

    const devMode = process.env.NODE_ENV === 'development' && !token;
    if (!user && !devMode) {
      return NextResponse.json(
        { error: 'Not signed in', content: 'Please sign in first.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    // Offline check-ins (lib/offline-queue.ts) arrive later with the day they
    // were filled in. Only today and the last 7 days are accepted, so a date
    // can't be used to back-fill weeks of fake check-ins or write the future.
    const serverToday = todayIso();
    if (body?.date !== undefined && !isAcceptableCheckinDate(body.date, serverToday)) {
      return NextResponse.json(
        { error: 'Invalid date', content: 'date must be YYYY-MM-DD, not in the future and at most 7 days ago.' },
        { status: 400 }
      );
    }
    const date: string = typeof body?.date === 'string' ? body.date : serverToday;
    const { sleepQuality, stress, fatigue, soreness, painFlag, painZone, session, sorenessZones } = body ?? {};

    if (![sleepQuality, stress, fatigue, soreness].every(isValidScale)) {
      return NextResponse.json(
        { error: 'Invalid checkin', content: 'sleepQuality, stress, fatigue, soreness must each be 1-7.' },
        { status: 400 }
      );
    }

    // Optional soreness map from the silhouette (ADP). Checked with the same
    // rules as the UI and the database; a broken map is refused, never
    // "fixed". Absent = the athlete skipped that step.
    let zones: SorenessZone[] | null = null;
    if (sorenessZones !== undefined && sorenessZones !== null) {
      const parsed = parseSorenessZones(sorenessZones);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: 'Invalid soreness map', content: 'sorenessZones: up to 6 muscle zones, severity 1-5.', details: parsed.error },
          { status: 400 }
        );
      }
      zones = parsed.value;
    }
    // null = no map sent; true/false = whether it was stored.
    let sorenessSaved: boolean | null = null;

    const checkin: DailyCheckin = {
      date,
      sleepQuality,
      stress,
      fatigue,
      soreness,
      painFlag: Boolean(painFlag),
      painZone: typeof painZone === 'string' ? painZone : undefined,
    };

    let sessionEntry: SessionEntry | null = null;
    if (session && typeof session.rpe === 'number' && typeof session.durationMinutes === 'number') {
      sessionEntry = { date, rpe: session.rpe, durationMinutes: session.durationMinutes };
    }

    let sessions: SessionEntry[];
    let checkins: DailyCheckin[];
    let context: UserContext;

    if (devMode) {
      const store = loadDevStore();
      store.checkins = store.checkins.filter((c) => c.date !== date);
      store.checkins.push(checkin);
      if (sessionEntry) store.sessions.push(sessionEntry);
      saveDevStore(store);

      sessions = store.sessions;
      checkins = store.checkins;
      context = store.context;
    } else {
      const client = createUserScopedClient(token!);
      const userId = user!.id;

      const { error: checkinError } = await client.from('checkins').upsert(
        {
          user_id: userId,
          date,
          sleep_quality: sleepQuality,
          stress,
          fatigue,
          soreness,
          pain_flag: Boolean(painFlag),
          pain_zone: painZone ?? null,
        },
        { onConflict: 'user_id,date' }
      );
      if (checkinError) throw checkinError;

      // The soreness map lives in its own table (14_soreness_map.sql): only the
      // athlete can read it — coaches see checkins, not this. It never blocks
      // the check-in: if the table is missing or the write fails, the check-in
      // and the readiness score still go through.
      if (zones) {
        const { error: mapError } = await client
          .from('soreness_maps')
          .upsert(
            { user_id: userId, date, zones: toSorenessRows(zones), updated_at: new Date().toISOString() },
            { onConflict: 'user_id,date' }
          );
        if (mapError) console.error('[/api/checkin POST] soreness map not saved:', mapError.message);
        sorenessSaved = !mapError;
      }

      if (sessionEntry) {
        const { error: sessionError } = await client.from('sessions_log').insert({
          user_id: userId,
          date,
          rpe: sessionEntry.rpe,
          duration_minutes: sessionEntry.durationMinutes,
        });
        if (sessionError) throw sessionError;
      }

      // 28-day trailing window: what calculateACWR / calculateMonotony need.
      const cutoff = new Date(date);
      cutoff.setDate(cutoff.getDate() - 28);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const [sessionsRes, checkinsRes, profileRes] = await Promise.all([
        client
          .from('sessions_log')
          .select('date, rpe, duration_minutes')
          .eq('user_id', userId)
          .gte('date', cutoffStr)
          .lte('date', date),
        client
          .from('checkins')
          .select('date, sleep_quality, stress, fatigue, soreness, pain_flag, pain_zone')
          .eq('user_id', userId)
          .gte('date', cutoffStr)
          .lte('date', date),
        client.from('profiles').select('exam_dates, match_dates').eq('id', userId).maybeSingle(),
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

    return NextResponse.json({ checkin, readiness, safetyViolations, sorenessSaved });
  } catch (error) {
    console.error('[/api/checkin POST] error:', error);
    return NextResponse.json(
      { error: 'Upstream error', content: 'Could not process check-in. Try again?' },
      { status: 502 }
    );
  }
}

// GET /api/checkin?days=30 — Readiness history for the trend chart.
// Recomputed fresh from raw data every time (the engine is cheap and pure),
// so there is never a stored score that can drift out of sync with the
// underlying sessions/checkins.
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = await getUserFromToken(token);

    const devMode = process.env.NODE_ENV === 'development' && !token;
    if (!user && !devMode) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const url = new URL(req.url);
    const daysParam = Number(url.searchParams.get('days') ?? '30');
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 90) : 30;

    let sessions: SessionEntry[];
    let checkins: DailyCheckin[];
    let context: UserContext;

    if (devMode) {
      const store = loadDevStore();
      sessions = store.sessions;
      checkins = store.checkins;
      context = store.context;
    } else {
      const client = createUserScopedClient(token!);
      const userId = user!.id;

      const today = todayIso();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days + 28)); // pad so day 1 of the range still has a full ACWR window
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const [sessionsRes, checkinsRes, profileRes] = await Promise.all([
        client
          .from('sessions_log')
          .select('date, rpe, duration_minutes')
          .eq('user_id', userId)
          .gte('date', cutoffStr)
          .lte('date', today),
        client
          .from('checkins')
          .select('date, sleep_quality, stress, fatigue, soreness, pain_flag, pain_zone')
          .eq('user_id', userId)
          .gte('date', cutoffStr)
          .lte('date', today),
        client.from('profiles').select('exam_dates, match_dates').eq('id', userId).maybeSingle(),
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (checkinsRes.error) throw checkinsRes.error;

      sessions = rowsToSessions((sessionsRes.data as DbSessionRow[]) ?? []);
      checkins = rowsToCheckins((checkinsRes.data as DbCheckinRow[]) ?? []);
      context = { examDates: profileRes.data?.exam_dates ?? [], matchDates: profileRes.data?.match_dates ?? [] };
    }

    const history = [];
    const end = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const result = calculateReadiness(sessions, checkins, dateStr, context);
      const dayCheckin = checkins.find((c) => c.date === dateStr);
      history.push({
        date: dateStr,
        score: result.score,
        zone: result.zone,
        acwr: result.acwr,
        acuteLoad: result.acuteLoad,
        chronicLoad: result.chronicLoad,
        monotony: result.monotony,
        hooperScore: result.hooperScore,
        trainingStreak: result.trainingStreak,
        hasCheckin: Boolean(dayCheckin),
        sleepQuality: dayCheckin?.sleepQuality ?? null,
        stress: dayCheckin?.stress ?? null,
        fatigue: dayCheckin?.fatigue ?? null,
        soreness: dayCheckin?.soreness ?? null,
      });
    }

    return NextResponse.json({ history });
  } catch (error) {
    console.error('[/api/checkin GET] error:', error);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}
