import { createHmac, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Shield Safety Pass — signed, self-verifying daily status token.
//
// The athlete's phone shows a QR code. A teacher or coach scans it with their
// own phone and lands on /pass, which asks the server to check the signature.
// So a screenshot with edited text can't pass as a real pass: only the server
// holding PASS_SIGNING_SECRET can produce a valid signature.
//
// Privacy (GDPR Art. 9 — health data of a minor): the token carries ONLY the
// date, the restriction level and restriction codes. No name, no user id, no
// body zone, no wellness answers. `id` is a one-way hash so the same pass can
// be referenced ("pass 4F2A-91C0") without revealing who it belongs to.
//
// Known limit: the pass proves "CloudPulse issued this restriction today",
// not "this person is the athlete". Identity is checked the usual way — it is
// the athlete's own logged-in phone.
// ---------------------------------------------------------------------------

export type PassLevel = 'block' | 'caution';

export type PassCode = 'PAIN_REPORTED' | 'MATCH_DAY' | 'PRE_MATCH' | 'POST_MATCH' | 'LOAD_SPIKE';

export type PassPayload = {
  v: 1;
  d: string; // ISO date the pass is valid for (UTC, same as check-in dates)
  s: PassLevel;
  r: PassCode[];
  id: string; // short one-way pass id, e.g. "4F2A91C0"
};

export type VerifyResult =
  | { valid: true; expired: boolean; payload: PassPayload }
  | { valid: false };

const PASS_CODES: readonly PassCode[] = ['PAIN_REPORTED', 'MATCH_DAY', 'PRE_MATCH', 'POST_MATCH', 'LOAD_SPIKE'];

function secret(): string | null {
  const s = process.env.PASS_SIGNING_SECRET;
  return s && s.length >= 32 ? s : null;
}

export function isPassSigningConfigured(): boolean {
  return secret() !== null;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(data: string, key: string): string {
  return b64url(createHmac('sha256', key).update(data).digest());
}

export function passId(userId: string, date: string): string {
  const key = secret();
  if (!key) throw new Error('PASS_SIGNING_SECRET is not configured');
  return createHmac('sha256', key).update(`pass-id:${userId}:${date}`).digest('hex').slice(0, 8).toUpperCase();
}

export function signPass(payload: PassPayload): string {
  const key = secret();
  if (!key) throw new Error('PASS_SIGNING_SECRET is not configured');
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${body}.${sign(body, key)}`;
}

function isPayload(x: unknown): x is PassPayload {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return (
    p.v === 1 &&
    typeof p.d === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.d) &&
    (p.s === 'block' || p.s === 'caution') &&
    Array.isArray(p.r) &&
    p.r.every((c) => PASS_CODES.includes(c as PassCode)) &&
    typeof p.id === 'string' &&
    /^[0-9A-F]{8}$/.test(p.id)
  );
}

export function verifyPass(token: string, today: string): VerifyResult {
  const key = secret();
  if (!key || typeof token !== 'string' || token.length > 1000) return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [body, sig] = parts;

  const expected = Buffer.from(sign(body, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { valid: false };

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { valid: false };
  }
  if (!isPayload(payload)) return { valid: false };

  return { valid: true, expired: payload.d !== today, payload };
}
