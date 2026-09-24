import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client used ONLY to verify who is calling the API.
// It uses the public anon key, so it can't do anything privileged —
// it just asks Supabase "is this access token valid, and whose is it?".
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const admin = createClient(supabaseUrl, supabaseAnonKey);

export async function getUserFromToken(accessToken: string | null) {
  if (!accessToken) return null;
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

// A client authenticated AS the calling user (their own JWT attached to
// every request). This is what lets Supabase's Row Level Security do its
// job: "own checkins" / "own sessions" policies check auth.uid(), and
// auth.uid() only resolves correctly when the request carries the user's
// token — the plain `admin` client above is anonymous and would be
// rejected by RLS on any insert/select against checkins or sessions_log.
export function createUserScopedClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
