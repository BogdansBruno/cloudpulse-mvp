import { NextResponse } from 'next/server';
import { getUserFromToken, createUserScopedClient } from '@/lib/supabase-server';
import { addDays } from '@/lib/checkin-streak';
import { activeTravel, parseTrips } from '@/lib/travel';
import { isTravelNoteConfigured, signTravelNote, travelNoteId, verifyTravelNote } from '@/lib/travel-note';

export const runtime = 'nodejs';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/travel-note — the signed-in athlete's note for school, only while
// a long away trip's recovery window is on (the trip comes from the coach via
// RLS, the athlete cannot invent one). Returns the token for the QR code.
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    if (!isTravelNoteConfigured()) return NextResponse.json({ status: 'unavailable' });

    const today = todayIso();
    const { data, error } = await createUserScopedClient(token!)
      .from('team_trips')
      .select('id, title, match_date, return_date, travel_hours')
      .gte('return_date', addDays(today, -3));
    if (error) return NextResponse.json({ status: 'unavailable' });

    const active = activeTravel(parseTrips(data as unknown[]), today);
    if (!active) return NextResponse.json({ status: 'none' });

    const id = travelNoteId(user.id, active.trip.id);
    const note = signTravelNote({ v: 1, k: 'travel', r: active.trip.returnDate, u: active.until, h: active.trip.travelHours, id });
    return NextResponse.json({ status: 'ok', token: note, id, until: active.until });
  } catch (error) {
    console.error('[/api/travel-note POST] error:', error);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}

// GET /api/travel-note?t=<token> — public check for the teacher's phone.
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') ?? '';
  const r = verifyTravelNote(t, todayIso());
  if (!r.valid) return NextResponse.json({ valid: false });
  return NextResponse.json({
    valid: true,
    expired: r.expired,
    returnDate: r.payload.r,
    until: r.payload.u,
    hours: r.payload.h,
    id: r.payload.id,
  });
}
