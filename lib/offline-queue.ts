// lib/offline-queue.ts
//
// Offline check-ins. When the phone has no connection (locker room, bus,
// basement gym), CheckinForm saves the answers here, in localStorage, and
// OfflineSync sends them to /api/checkin as soon as the network is back.
//
// Rules this file enforces:
// - Each saved check-in keeps the day it was FILLED IN, not the day it was
//   sent, so a check-in made offline on Monday and synced on Tuesday still
//   counts for Monday.
// - Each item is tagged with the user who filled it in. On a shared phone,
//   another account never sends someone else's answers.
// - One item per user per day: filling it in twice keeps the latest, the same
//   as the server's upsert on (user_id, date).
// - Items older than MAX_AGE_DAYS are thrown away. The server refuses them
//   too (isAcceptableCheckinDate), so nobody can back-fill a streak.
// - No readiness score is ever computed offline. The engine needs the
//   athlete's history from the database, and we don't show made-up numbers.
//
// Pure functions with the storage passed in, so it all runs in unit tests.

export const QUEUE_KEY = 'cloudpulse.offlineCheckins.v1';
export const MAX_AGE_DAYS = 7;

/** Fired on window whenever the queue changes, so badges can update. */
export const QUEUE_EVENT = 'cloudpulse:queue-changed';
/** Fired on window after queued check-ins reached the server. */
export const SYNCED_EVENT = 'cloudpulse:checkins-synced';

export type CheckinPayload = {
  sleepQuality: number;
  stress: number;
  fatigue: number;
  soreness: number;
  painFlag: boolean;
  painZone?: string;
  session?: { rpe: number; durationMinutes: number };
  /** Optional soreness map from the silhouette; the server validates it. */
  sorenessZones?: { zoneId: string; side: string; severity: number }[];
};

export type QueuedCheckin = {
  id: string; // `${userId}:${date}`
  userId: string;
  date: string; // YYYY-MM-DD (UTC), the day it was filled in
  savedAt: number; // epoch ms
  payload: CheckinPayload;
};

export type KVStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function dayNumber(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
}

/**
 * Dates the server accepts for a check-in: a real calendar date, at most
 * MAX_AGE_DAYS in the past, and not in the future (one day of slack for a
 * phone clock that's slightly ahead around midnight).
 */
export function isAcceptableCheckinDate(date: unknown, today: string): date is string {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return false;
  const diff = dayNumber(today) - dayNumber(date);
  return diff >= -1 && diff <= MAX_AGE_DAYS;
}

function isScale(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7;
}

function isQueuedCheckin(x: unknown): x is QueuedCheckin {
  if (!x || typeof x !== 'object') return false;
  const q = x as Partial<QueuedCheckin>;
  const p = q.payload as Partial<CheckinPayload> | undefined;
  return (
    typeof q.id === 'string' &&
    typeof q.userId === 'string' &&
    typeof q.date === 'string' &&
    DATE_RE.test(q.date) &&
    typeof q.savedAt === 'number' &&
    !!p &&
    isScale(p.sleepQuality) &&
    isScale(p.stress) &&
    isScale(p.fatigue) &&
    isScale(p.soreness) &&
    typeof p.painFlag === 'boolean'
  );
}

/** Never throws: broken or foreign JSON just reads as an empty queue. */
export function readQueue(store: KVStore): QueuedCheckin[] {
  try {
    const raw = store.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isQueuedCheckin) : [];
  } catch {
    return [];
  }
}

export function writeQueue(store: KVStore, items: QueuedCheckin[]): void {
  store.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function makeQueuedCheckin(
  userId: string,
  date: string,
  payload: CheckinPayload,
  now: number = Date.now()
): QueuedCheckin {
  return { id: `${userId}:${date}`, userId, date, savedAt: now, payload };
}

/** Adds or replaces (same user + same day) and returns the new queue. */
export function enqueueCheckin(store: KVStore, item: QueuedCheckin): QueuedCheckin[] {
  const next = [...readQueue(store).filter((q) => q.id !== item.id), item];
  writeQueue(store, next);
  return next;
}

export function removeFromQueue(store: KVStore, ids: readonly string[]): QueuedCheckin[] {
  const drop = new Set(ids);
  const next = readQueue(store).filter((q) => !drop.has(q.id));
  writeQueue(store, next);
  return next;
}

/** Splits one user's items into ones to send (oldest first) and ones too old to send. */
export function pendingFor(
  items: readonly QueuedCheckin[],
  userId: string,
  today: string
): { send: QueuedCheckin[]; expired: QueuedCheckin[] } {
  const mine = items.filter((q) => q.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
  return {
    send: mine.filter((q) => isAcceptableCheckinDate(q.date, today)),
    expired: mine.filter((q) => !isAcceptableCheckinDate(q.date, today)),
  };
}

/** What to do with a queued item after the server answered with this HTTP status. */
export function syncOutcome(status: number): 'done' | 'drop' | 'retry' {
  if (status >= 200 && status < 300) return 'done';
  // 400 = the server will never accept this body (bad values or date). Keeping
  // it would retry forever, so it's dropped.
  if (status === 400 || status === 422) return 'drop';
  // 401/403 (session expired), 429, 5xx: try again later.
  return 'retry';
}

/** A failure that means "no connection", as opposed to the server saying no. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true; // fetch() without a network
  const name = (err as { name?: unknown } | null)?.name;
  return name === 'AbortError' || name === 'TimeoutError';
}

/**
 * The signed-in user's id straight from supabase-js's own localStorage entry.
 * Used offline instead of supabase.auth.getSession(), which tries to refresh
 * an expired token over the network and can hang for ~30 s with no signal.
 */
export function storedUserId(store: KVStore, supabaseUrl: string): string | null {
  try {
    const key = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
    // Default layout keeps the user inside the session entry; newer
    // supabase-js can keep it in a separate "-user" entry instead.
    for (const k of [key, `${key}-user`]) {
      const raw = store.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { user?: { id?: unknown } } | null;
      const id = parsed?.user?.id;
      if (typeof id === 'string' && id.length > 0) return id;
    }
    return null;
  } catch {
    return null;
  }
}

/** Rejects with a TimeoutError (which isNetworkError recognises) if `p` takes longer than `ms`. */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      const e = new Error(`timed out after ${ms} ms`);
      e.name = 'TimeoutError';
      reject(e);
    }, ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}
