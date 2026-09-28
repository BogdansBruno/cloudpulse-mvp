import { describe, it, expect } from 'vitest';
import {
  QUEUE_KEY,
  readQueue,
  enqueueCheckin,
  removeFromQueue,
  makeQueuedCheckin,
  pendingFor,
  isAcceptableCheckinDate,
  syncOutcome,
  isNetworkError,
  storedUserId,
  withTimeout,
  type KVStore,
  type CheckinPayload,
} from './offline-queue';

function memoryStore(init: Record<string, string> = {}): KVStore & { data: Record<string, string> } {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const TODAY = '2026-10-01';
const P: CheckinPayload = { sleepQuality: 5, stress: 4, fatigue: 4, soreness: 3, painFlag: false };

describe('isAcceptableCheckinDate', () => {
  it('accepts today and up to 7 days back', () => {
    expect(isAcceptableCheckinDate(TODAY, TODAY)).toBe(true);
    expect(isAcceptableCheckinDate('2026-09-24', TODAY)).toBe(true);
  });

  it('rejects older, future and malformed dates', () => {
    expect(isAcceptableCheckinDate('2026-09-23', TODAY)).toBe(false);
    expect(isAcceptableCheckinDate('2026-10-03', TODAY)).toBe(false);
    expect(isAcceptableCheckinDate('2026-02-30', TODAY)).toBe(false);
    expect(isAcceptableCheckinDate('01.10.2026', TODAY)).toBe(false);
    expect(isAcceptableCheckinDate(undefined, TODAY)).toBe(false);
  });

  it('allows one day of clock slack', () => {
    expect(isAcceptableCheckinDate('2026-10-02', TODAY)).toBe(true);
  });
});

describe('queue storage', () => {
  it('reads an empty or broken queue as empty', () => {
    expect(readQueue(memoryStore())).toEqual([]);
    expect(readQueue(memoryStore({ [QUEUE_KEY]: '{not json' }))).toEqual([]);
    expect(readQueue(memoryStore({ [QUEUE_KEY]: '[{"id":1}]' }))).toEqual([]);
  });

  it('keeps one item per user per day, latest wins', () => {
    const store = memoryStore();
    enqueueCheckin(store, makeQueuedCheckin('u1', TODAY, P, 1));
    enqueueCheckin(store, makeQueuedCheckin('u1', TODAY, { ...P, stress: 7 }, 2));
    enqueueCheckin(store, makeQueuedCheckin('u2', TODAY, P, 3));
    const q = readQueue(store);
    expect(q.length).toBe(2);
    expect(q.find((x) => x.userId === 'u1')?.payload.stress).toBe(7);
  });

  it('removes sent items', () => {
    const store = memoryStore();
    enqueueCheckin(store, makeQueuedCheckin('u1', TODAY, P));
    enqueueCheckin(store, makeQueuedCheckin('u1', '2026-09-30', P));
    expect(removeFromQueue(store, [`u1:${TODAY}`]).map((q) => q.date)).toEqual(['2026-09-30']);
  });
});

describe('pendingFor', () => {
  it('sends only this user’s items, oldest first, and expires old ones', () => {
    const items = [
      makeQueuedCheckin('u1', TODAY, P),
      makeQueuedCheckin('u2', '2026-09-30', P),
      makeQueuedCheckin('u1', '2026-09-29', P),
      makeQueuedCheckin('u1', '2026-09-01', P),
    ];
    const { send, expired } = pendingFor(items, 'u1', TODAY);
    expect(send.map((q) => q.date)).toEqual(['2026-09-29', TODAY]);
    expect(expired.map((q) => q.date)).toEqual(['2026-09-01']);
  });
});

describe('sync helpers', () => {
  it('maps HTTP status to an outcome', () => {
    expect(syncOutcome(200)).toBe('done');
    expect(syncOutcome(400)).toBe('drop');
    expect(syncOutcome(401)).toBe('retry');
    expect(syncOutcome(503)).toBe('retry');
  });

  it('recognises network failures', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError({ name: 'TimeoutError' })).toBe(true);
    expect(isNetworkError(new Error('Could not submit check-in'))).toBe(false);
  });

  it('reads the user id supabase-js stored, without the network', () => {
    const url = 'https://abcref.supabase.co';
    expect(storedUserId(memoryStore(), url)).toBeNull();
    expect(
      storedUserId(memoryStore({ 'sb-abcref-auth-token': JSON.stringify({ access_token: 'x', user: { id: 'u1' } }) }), url)
    ).toBe('u1');
    expect(
      storedUserId(memoryStore({ 'sb-abcref-auth-token-user': JSON.stringify({ user: { id: 'u2' } }) }), url)
    ).toBe('u2');
    expect(storedUserId(memoryStore({ 'sb-abcref-auth-token': 'garbage' }), url)).toBeNull();
  });

  it('turns a hanging request into a network-style timeout', async () => {
    const never = new Promise<never>(() => undefined);
    let caught: unknown = null;
    try {
      await withTimeout(never, 10);
    } catch (e) {
      caught = e;
    }
    expect(isNetworkError(caught)).toBe(true);
    expect(await withTimeout(Promise.resolve(5), 1000)).toBe(5);
  });
});
