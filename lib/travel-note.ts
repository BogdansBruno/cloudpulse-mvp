import { createHmac, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Travel note for school — signed like the Safety Pass (lib/safety-pass.ts),
// with the same PASS_SIGNING_SECRET but a separate signing domain, so a pass
// can never be passed off as a note or the other way round.
//
// The note says only: the athlete came back from an away match on <date>
// after <h> hours on the road, and asks the teacher to consider moving oral
// answers by a day. The teacher decides. No name, no user id, no health data.
// ---------------------------------------------------------------------------

export type TravelNotePayload = {
  v: 1;
  k: 'travel';
  /** Return date (UTC calendar day). */
  r: string;
  /** Last day the note applies to. */
  u: string;
  /** Hours on the road, there and back. */
  h: number;
  id: string;
};

export type TravelNoteVerify =
  | { valid: true; expired: boolean; payload: TravelNotePayload }
  | { valid: false };

const DOMAIN = 'cloudpulse-travel-note-v1';

function secret(): string | null {
  const s = process.env.PASS_SIGNING_SECRET;
  return s && s.length >= 32 ? s : null;
}

export function isTravelNoteConfigured(): boolean {
  return secret() !== null;
}

function sign(body: string, key: string): string {
  return createHmac('sha256', key).update(`${DOMAIN}:${body}`).digest('base64url');
}

export function travelNoteId(userId: string, tripId: string): string {
  const key = secret();
  if (!key) throw new Error('PASS_SIGNING_SECRET is not configured');
  return createHmac('sha256', key).update(`${DOMAIN}:id:${userId}:${tripId}`).digest('hex').slice(0, 8).toUpperCase();
}

export function signTravelNote(payload: TravelNotePayload): string {
  const key = secret();
  if (!key) throw new Error('PASS_SIGNING_SECRET is not configured');
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, key)}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPayload(x: unknown): x is TravelNotePayload {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return (
    p.v === 1 &&
    p.k === 'travel' &&
    typeof p.r === 'string' &&
    DATE_RE.test(p.r) &&
    typeof p.u === 'string' &&
    DATE_RE.test(p.u) &&
    typeof p.h === 'number' &&
    Number.isInteger(p.h) &&
    p.h >= 1 &&
    p.h <= 48 &&
    typeof p.id === 'string' &&
    /^[0-9A-F]{8}$/.test(p.id)
  );
}

export function verifyTravelNote(token: string, today: string): TravelNoteVerify {
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
  return { valid: true, expired: today > payload.u, payload };
}
