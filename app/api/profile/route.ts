import { NextResponse } from 'next/server';
import { getUserFromToken, createUserScopedClient } from '@/lib/supabase-server';
import { loadDevStore, saveDevStore } from '@/lib/dev-store';
import type {
  ProfileRequestBody,
  CalendarRequestBody,
  TrainingScheduleEntry,
  InjuryRecord,
} from '@/lib/types/readiness';

export const runtime = 'nodejs';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATES = 100;
const MAX_SUBJECT_LENGTH = 40;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

// Real calendar dates only, no duplicates, sorted. Returns null if invalid.
function cleanDates(v: unknown): string[] | null {
  if (!isStringArray(v) || v.length > MAX_DATES) return null;
  for (const d of v) {
    if (!ISO_DATE.test(d)) return null;
    const parsed = new Date(`${d}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== d) return null;
  }
  return [...new Set(v)].sort();
}

// Keeps labels only for dates that are still in the exam list.
function cleanSubjects(v: unknown, examDates: string[]): Record<string, string> | null {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  const out: Record<string, string> = {};
  for (const [date, label] of Object.entries(v as Record<string, unknown>)) {
    if (typeof label !== 'string') return null;
    const trimmed = label.trim().slice(0, MAX_SUBJECT_LENGTH);
    if (trimmed && examDates.includes(date)) out[date] = trimmed;
  }
  return out;
}

// TEMP DEBUG HELPER — surfaces the real error in the response body when
// NODE_ENV=development, so we don't have to go dig through the terminal
// window to see what actually broke. Remove once /api/profile is stable.
function debugPayload(error: unknown) {
  if (process.env.NODE_ENV !== 'development') return {};
  const e = error as { message?: string; code?: string; details?: string; hint?: string } | null;
  return {
    debug: {
      message: e?.message ?? String(error),
      code: e?.code ?? null,
      details: e?.details ?? null,
      hint: e?.hint ?? null,
    },
  };
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = await getUserFromToken(token);
  const devMode = process.env.NODE_ENV === 'development' && !token;
  return { token, user, devMode };
}

// POST /api/profile — onboarding form submits here. Upserts the profile
// row keyed by user id. match_dates / exam_dates feed straight into the
// Readiness engine's UserContext on every subsequent /api/checkin call.
//
// Only the fields present in the body are written. Before, every save wrote
// all columns, so re-running onboarding wiped training_schedule and
// injury_history with empty arrays.
export async function POST(req: Request) {
  try {
    const { token, user, devMode } = await authenticate(req);
    if (!user && !devMode) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ProfileRequestBody;
    const has = (k: keyof ProfileRequestBody) => Object.prototype.hasOwnProperty.call(body, k);

    const age = typeof body.age === 'number' ? body.age : null;
    const sport = typeof body.sport === 'string' ? body.sport : null;
    const trainingSchedule: TrainingScheduleEntry[] = Array.isArray(body.trainingSchedule)
      ? body.trainingSchedule
      : [];
    const matchDates = cleanDates(body.matchDates) ?? [];
    const examDates = cleanDates(body.examDates) ?? [];
    const injuryHistory: InjuryRecord[] = Array.isArray(body.injuryHistory) ? body.injuryHistory : [];

    if (devMode) {
      const store = loadDevStore();
      store.profile = {
        age: has('age') ? age : store.profile.age,
        sport: has('sport') ? sport : store.profile.sport,
        trainingSchedule: has('trainingSchedule') ? trainingSchedule : store.profile.trainingSchedule,
        injuryHistory: has('injuryHistory') ? injuryHistory : store.profile.injuryHistory,
      };
      store.context = {
        examDates: has('examDates') ? examDates : store.context.examDates ?? [],
        matchDates: has('matchDates') ? matchDates : store.context.matchDates ?? [],
      };
      saveDevStore(store);
    } else {
      const row: Record<string, unknown> = { id: user!.id };
      if (has('age')) row.age = age;
      if (has('sport')) row.sport = sport;
      if (has('trainingSchedule')) row.training_schedule = trainingSchedule;
      if (has('matchDates')) row.match_dates = matchDates;
      if (has('examDates')) row.exam_dates = examDates;
      if (has('injuryHistory')) row.injury_history = injuryHistory;

      const client = createUserScopedClient(token!);
      const { error } = await client.from('profiles').upsert(row, { onConflict: 'id' });
      if (error) throw error;
    }

    return NextResponse.json({
      profile: { age, sport, trainingSchedule, matchDates, examDates, injuryHistory },
      _devMode: devMode,
    });
  } catch (error) {
    console.error('[/api/profile POST] error:', error);
    return NextResponse.json(
      { error: 'Upstream error', content: 'Could not save profile.', ...debugPayload(error) },
      { status: 502 }
    );
  }
}

// PATCH /api/profile — school calendar page (/calendar). Changes only exam
// dates, match dates and exam labels. The DB trigger from
// supabase/sql/05_school_calendar.sql recomputes stored readiness right away.
export async function PATCH(req: Request) {
  try {
    const { token, user, devMode } = await authenticate(req);
    if (!user && !devMode) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as CalendarRequestBody;
    const examDates = cleanDates(body.examDates);
    const matchDates = cleanDates(body.matchDates);
    if (!examDates || !matchDates) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
    }
    const examSubjects = cleanSubjects(body.examSubjects ?? {}, examDates);
    if (!examSubjects) {
      return NextResponse.json({ error: 'Invalid subjects' }, { status: 400 });
    }

    if (devMode) {
      const store = loadDevStore();
      store.context = { ...store.context, examDates, matchDates };
      saveDevStore(store);
    } else {
      const client = createUserScopedClient(token!);
      const { error } = await client.from('profiles').upsert(
        { id: user!.id, exam_dates: examDates, match_dates: matchDates, exam_subjects: examSubjects },
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    return NextResponse.json({ examDates, matchDates, examSubjects });
  } catch (error) {
    console.error('[/api/profile PATCH] error:', error);
    return NextResponse.json({ error: 'Upstream error', ...debugPayload(error) }, { status: 502 });
  }
}

// GET /api/profile — used by the onboarding form and the calendar page to
// pre-fill, and by the check-in UI for context without a second round trip.
export async function GET(req: Request) {
  try {
    const { token, user, devMode } = await authenticate(req);
    if (!user && !devMode) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    if (devMode) {
      const store = loadDevStore();
      return NextResponse.json({
        profile: {
          ...store.profile,
          matchDates: store.context.matchDates ?? [],
          examDates: store.context.examDates ?? [],
          examSubjects: {},
        },
      });
    }

    const client = createUserScopedClient(token!);
    const { data, error } = await client
      .from('profiles')
      .select('age, sport, training_schedule, match_dates, exam_dates, exam_subjects, injury_history')
      .eq('id', user!.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      profile: {
        age: data?.age ?? null,
        sport: data?.sport ?? null,
        trainingSchedule: data?.training_schedule ?? [],
        matchDates: data?.match_dates ?? [],
        examDates: data?.exam_dates ?? [],
        examSubjects: data?.exam_subjects ?? {},
        injuryHistory: data?.injury_history ?? [],
      },
    });
  } catch (error) {
    console.error('[/api/profile GET] error:', error);
    return NextResponse.json({ error: 'Upstream error', ...debugPayload(error) }, { status: 502 });
  }
}
