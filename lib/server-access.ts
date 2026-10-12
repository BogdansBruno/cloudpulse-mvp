import { NextResponse } from 'next/server';
import { createUserScopedClient } from '@/lib/supabase-server';

// Server-side ban / lockdown check for API routes.
//
// The database already refuses banned users on every data table (restrictive
// RLS policy, supabase/sql/17). This adds a clear 403 for them at the API
// edge, before any work is done, so the app answers the same way whether the
// request came from our UI or from curl.
//
// Fails OPEN on a lookup error (function not installed yet, network blip):
// the RLS policy is the real lock, and a hiccup here must not stop a live
// demo or an athlete's check-in. Returns a ready response, or null to go on.
export async function blockedResponse(token: string | null): Promise<Response | null> {
  if (!token) return null;
  try {
    const client = createUserScopedClient(token);
    const { data, error } = await client.rpc('is_blocked');
    if (error) return null;
    if (data === true) {
      return NextResponse.json(
        { error: 'Access blocked', content: 'This account is blocked or the app is temporarily closed.' },
        { status: 403 }
      );
    }
  } catch {
    // fail open, see above
  }
  return null;
}
