// Owner-controlled access gate.
//
// Two independent levers (supabase/sql/17_hardening.sql):
//   1. `app_control` — a single row kill switch. When `lockdown` is true,
//      every page under app/(main) is closed to everyone except the
//      email(s) in ADMIN_EMAILS.
//   2. `banned_users` — a table of individually banned emails. A banned
//      user is signed out and shown a blocked screen, regardless of the
//      lockdown flag.
//
// Both tables are readable and writable ONLY by the owner. Everyone else asks
// the database about themselves through my_access_status(), and the data
// tables carry a restrictive RLS policy (is_blocked()), so a ban is enforced
// by the server, not by this screen. API routes also check it (see
// lib/server-access.ts).
import { supabase } from '@/lib/supabase';

// Comma-separated list of owner emails. Set in .env.local for local dev
// AND in the Vercel project's Environment Variables for production —
// it must be present at build/runtime on both, and it's NEXT_PUBLIC_
// because the check also runs in the browser before a page renders.
const RAW_ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '';

export const ADMIN_EMAILS = RAW_ADMIN_EMAILS.split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export type AccessStatus =
  | { blocked: false }
  | { blocked: true; reason: 'lockdown' }
  | { blocked: true; reason: 'banned'; banReason: string | null };

export async function checkAccess(email: string | null | undefined): Promise<AccessStatus> {
  // Owners are never blocked by their own switch.
  if (isAdminEmail(email)) return { blocked: false };
  if (!email) return { blocked: false };

  // Server-side answer (supabase/sql/17): the database decides from the
  // caller's own token. The ban list itself is no longer readable by anyone
  // but the owner, and the same rule is enforced by RLS on the data tables,
  // so hiding this screen in devtools gives a banned user nothing.
  const { data, error } = await supabase.rpc('my_access_status');
  if (!error && data && typeof data === 'object') {
    const s = data as { blocked?: boolean; reason?: string; ban_reason?: string | null };
    if (s.blocked && s.reason === 'banned') return { blocked: true, reason: 'banned', banReason: s.ban_reason ?? null };
    if (s.blocked) return { blocked: true, reason: 'lockdown' };
    return { blocked: false };
  }

  // Fallback while SQL 17 is not applied yet: the old table reads.
  const [{ data: control }, banResult] = await Promise.all([
    supabase.from('app_control').select('lockdown').eq('id', 1).maybeSingle(),
    supabase.from('banned_users').select('reason').eq('email', email.toLowerCase()).maybeSingle(),
  ]);
  if (banResult.data) {
    return { blocked: true, reason: 'banned', banReason: banResult.data.reason ?? null };
  }
  if (control?.lockdown) {
    return { blocked: true, reason: 'lockdown' };
  }
  return { blocked: false };
}

// --- Admin-only writes ------------------------------------------------
// These succeed only for an admin's own Supabase session — RLS rejects
// the write for anyone else, so there's nothing privileged sitting in
// client code here.

export async function setLockdown(next: boolean) {
  const { error } = await supabase.from('app_control').update({ lockdown: next }).eq('id', 1);
  if (error) throw error;
}

export async function banUser(email: string, reason: string) {
  const { error } = await supabase
    .from('banned_users')
    .upsert({ email: email.trim().toLowerCase(), reason: reason.trim() || null });
  if (error) throw error;
}

export async function unbanUser(email: string) {
  const { error } = await supabase.from('banned_users').delete().eq('email', email.trim().toLowerCase());
  if (error) throw error;
}
