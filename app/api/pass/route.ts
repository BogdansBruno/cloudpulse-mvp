import { NextResponse } from 'next/server';
import { getUserFromToken, createUserScopedClient } from '@/lib/supabase-server';
import {
  signPass,
  verifyPass,
  passId,
  isPassSigningConfigured,
  type PassCode,
  type PassLevel,
} from '@/lib/safety-pass';

export const runtime = 'nodejs';

// Same UTC date convention as /api/checkin, so "today" matches the stored row.
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Same threshold the engine uses for its biggest ACWR penalty ("резкий скачок").
// The engine does NOT hard-block on load, so neither do we: this is 'caution'.
const LOAD_SPIKE_ACWR = 1.5;

const BLOCK_CODES: readonly PassCode[] = ['PAIN_REPORTED', 'MATCH_DAY', 'PRE_MATCH', 'POST_MATCH'];

type DbRow = {
  pain_zone: string | null;
  acwr: number | string | null; // NUMERIC may arrive as a string
  safety_violations: { code?: string }[] | null;
};

// POST /api/pass — the athlete's own status for today + a signed pass token.
// Reads the check-in row computed by the DB trigger (the same formulas as the
// app engine; clients can't write those columns), so the pass can't be
// talked into saying something the engine didn't decide.
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const today = todayIso();
    const { data, error } = await createUserScopedClient(token!)
      .from('checkins')
      .select('pain_zone, acwr, safety_violations')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    if (error) throw error;

    if (!data) return NextResponse.json({ status: 'no_checkin', date: today });

    const row = data as DbRow;
    const acwr = row.acwr === null ? null : Number(row.acwr);
    const codes = (row.safety_violations ?? [])
      .map((v) => v.code)
      .filter((c): c is PassCode => BLOCK_CODES.includes(c as PassCode));
    if (acwr !== null && acwr > LOAD_SPIKE_ACWR) codes.push('LOAD_SPIKE');

    if (codes.length === 0) return NextResponse.json({ status: 'clear', date: today, acwr });

    const level: PassLevel = codes.some((c) => c !== 'LOAD_SPIKE') ? 'block' : 'caution';

    let passToken: string | null = null;
    let id: string | null = null;
    if (isPassSigningConfigured()) {
      id = passId(user.id, today);
      passToken = signPass({ v: 1, d: today, s: level, r: codes, id });
    }

    return NextResponse.json({
      status: level,
      date: today,
      codes,
      acwr,
      painZone: row.pain_zone || null, // shown to the athlete only, never put in the token
      passId: id,
      token: passToken,
    });
  } catch (error) {
    console.error('[/api/pass POST] error:', error);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}

// GET /api/pass?t=<token> — public verification for the teacher's phone.
// Returns only what's inside the signed token: date, level, codes, pass id.
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') ?? '';
  const result = verifyPass(t, todayIso());
  if (!result.valid) return NextResponse.json({ valid: false });
  const { payload, expired } = result;
  return NextResponse.json({
    valid: true,
    expired,
    date: payload.d,
    status: payload.s,
    codes: payload.r,
    passId: payload.id,
  });
}
