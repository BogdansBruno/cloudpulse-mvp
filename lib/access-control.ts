// Owner-controlled access gate.
//
// Two independent levers, both readable/writable through normal Supabase
// RLS (no service-role key, no API route needed):
//   1. `app_control` — a single row kill switch. When `lockdown` is true,
//      every page under app/(main) is closed to everyone except the
//      email(s) in ADMIN_EMAILS.
//   2. `banned_users` — a table of individually banned emails. A banned
//      user is signed out and shown a blocked screen, regardless of the
//      lockdown flag.
//
// Both tables are publicly READABLE (so the check works the instant a
// session loads) but only WRITABLE by an admin email, enforced by RLS
// policies in supabase/access-control.sql — never trust the client alone.
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

  const [{ data: control }, banResult] = await Promise.all([
    supabase.from('app_control').select('lockdown').eq('id', 1).maybeSingle(),
    email
      ? supabase.from('banned_users').select('reason').eq('email', email.toLowerCase()).maybeSingle()
      : Promise.resolve({ data: null }),
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
