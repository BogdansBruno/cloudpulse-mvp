// lib/invite.ts
//
// Pure helpers for team invites (QR / link). No Supabase, no React — so they
// run in unit tests and on both server and client. The database is the real
// gatekeeper (see supabase/sql/08_team_invites.sql); these only keep the UI
// tidy and stop the login page from being turned into an open redirect.

// Same alphabet the database uses in gen_invite_code(): no I, O, 0, 1.
const INVITE_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

/** Upper-cases and strips spaces/dashes, so "abcd-efgh " reads as "ABCDEFGH". */
export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidInviteCode(raw: string): boolean {
  return INVITE_CODE_RE.test(normalizeInviteCode(raw));
}

/** "ABCDEFGH" -> "ABCD-EFGH" for reading aloud or typing by hand. */
export function formatInviteCode(code: string): string {
  const c = normalizeInviteCode(code);
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export function joinPath(code: string): string {
  return `/join/${normalizeInviteCode(code)}`;
}

export function joinUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}${joinPath(code)}`;
}

/**
 * The only places login/signup may send someone back to via ?next=.
 * Anything else (external URLs, "//evil.com", other pages) is ignored,
 * so a crafted link can't bounce a fresh login to a foreign site.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  const m = /^\/join\/([A-Za-z0-9-]{1,20})$/.exec(next);
  if (!m || !isValidInviteCode(m[1])) return null;
  return joinPath(m[1]);
}

export type JoinErrorCode =
  | 'INVALID_CODE'
  | 'NOT_ATHLETE'
  | 'OWN_TEAM'
  | 'BAD_LABEL'
  | 'NOT_AUTHENTICATED'
  | 'DEMO_ACCOUNT'
  | 'DEMO_TEAM'
  | 'UNKNOWN';

/** join_team() raises short codes; map the Postgres error message back to one. */
export function joinErrorCode(message: string | null | undefined): JoinErrorCode {
  const known: JoinErrorCode[] = [
    'INVALID_CODE',
    'NOT_ATHLETE',
    'OWN_TEAM',
    'BAD_LABEL',
    'NOT_AUTHENTICATED',
    'DEMO_ACCOUNT',
    'DEMO_TEAM',
  ];
  return known.find((k) => message?.includes(k)) ?? 'UNKNOWN';
}

export const ATHLETE_LABEL_MAX = 40;

/** Trimmed label, or null if empty / too long (mirrors the check in join_team). */
export function cleanAthleteLabel(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s || s.length > ATHLETE_LABEL_MAX) return null;
  return s;
}
