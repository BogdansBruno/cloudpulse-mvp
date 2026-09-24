import { NextResponse } from 'next/server';
import { getUserFromToken, createUserScopedClient } from '@/lib/supabase-server';
import { loadDevStore, saveDevStore } from '@/lib/dev-store';
import type { ProfileRequestBody, TrainingScheduleEntry, InjuryRecord } from '@/lib/types/readiness';

export const runtime = 'nodejs';

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
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

// POST /api/profile — onboarding form submits here. Upserts the profile
// row keyed by user id. match_dates / exam_dates feed straight into the
// Readiness engine's UserContext on every subsequent /api/checkin call.
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = await getUserFromToken(token);

    const devMode = process.env.NODE_ENV === 'development' && !token;
    if (!user && !devMode) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ProfileRequestBody;

    const age = typeof body.age === 'number' ? body.age : null;
    const sport = typeof body.sport === 'string' ? body.sport : null;
    const trainingSchedule: TrainingScheduleEntry[] = Array.isArray(body.trainingSchedule)
      ? body.trainingSchedule
      : [];
    const matchDates = isStringArray(body.matchDates) ? body.matchDates : [];
    const examDates = isStringArray(body.examDates) ? body.examDates : [];
    const injuryHistory: InjuryRecord[] = Array.isArray(body.injuryHistory) ? body.injuryHistory : [];

    if (devMode) {
      const store = loadDevStore();
      store.profile = { age, sport, trainingSchedule, injuryHistory };
      store.context = { examDates, matchDates };
      saveDevStore(store);
    } else {
      const client = createUserScopedClient(token!);
      const { error } = await client.from('profiles').upsert(
        {
          id: user!.id,
          age,
          sport,
          training_schedule: trainingSchedule,
          match_dates: matchDates,
          exam_dates: examDates,
          injury_history: injuryHistory,
        },
        { onConflict: 'id' }
      );
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

// GET /api/profile — used by the onboarding form to pre-fill on return
// visits, and by the check-in UI to show "training days left this week"
// type context without a second round trip.
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = await getUserFromToken(token);

    const devMode = process.env.NODE_ENV === 'development' && !token;
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
        },
      });
    }

    const client = createUserScopedClient(token!);
    const { data, error } = await client
      .from('profiles')
      .select('age, sport, training_schedule, match_dates, exam_dates, injury_history')
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
        injuryHistory: data?.injury_history ?? [],
      },
    });
  } catch (error) {
    console.error('[/api/profile GET] error:', error);
    return NextResponse.json({ error: 'Upstream error', ...debugPayload(error) }, { status: 502 });
  }
}
