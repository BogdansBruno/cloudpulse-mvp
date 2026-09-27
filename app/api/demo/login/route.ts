import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEMO_ACCOUNTS, isDemoRole } from '@/lib/demo';

// ---------------------------------------------------------------------------
// One-click sign-in for the jury demo. The shared demo password lives only
// in the server environment (DEMO_PASSWORD) — it never reaches the browser.
// Without DEMO_PASSWORD the demo is simply switched off (404).
//
// After signing in we call reset_demo_if_stale() AS that demo user, so the
// first visitor of each day gets fresh data dated to today (ACWR windows,
// "match tomorrow", "exam today" all stay true without anyone re-running SQL).
// ---------------------------------------------------------------------------

// Always evaluate at request time (the env flag can be switched off in Vercel).
export const dynamic = 'force-dynamic';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serverAuth = { persistSession: false, autoRefreshToken: false };

export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.DEMO_PASSWORD) });
}

export async function POST(req: Request) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return NextResponse.json({ error: 'DEMO_DISABLED' }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { role?: unknown } | null;
  const role = body?.role;
  if (!isDemoRole(role)) return NextResponse.json({ error: 'BAD_ROLE' }, { status: 400 });

  const account = DEMO_ACCOUNTS[role];
  const client = createClient(url, anonKey, { auth: serverAuth });
  const { data, error } = await client.auth.signInWithPassword({ email: account.email, password });
  if (error || !data.session) {
    return NextResponse.json({ error: 'LOGIN_FAILED' }, { status: 502 });
  }

  const asDemoUser = createClient(url, anonKey, {
    auth: serverAuth,
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
  // Best effort: a failed reset still lets the jury in with yesterday's data.
  await asDemoUser.rpc('reset_demo_if_stale');

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    home: account.home,
  });
}
