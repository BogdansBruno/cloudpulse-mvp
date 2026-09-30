// lib/adp-coach-cache.ts
//
// Keeps the AI coach cheap and fast (server memory, best effort — each Vercel
// instance has its own; losing it only means one more model call):
//   - one plan per athlete + exact context: the key is a hash of the frozen
//     CoachingContext, so a new check-in, soreness map or language is a new
//     key, and the same inputs never ask the model twice;
//   - two requests for the same key at the same moment share one call;
//   - per-athlete limit on model calls per hour; above it the rules-only plan
//     is shown (nothing breaks, nobody burns the team's API credits).
// Rules-only answers given because of an error or the limit are NOT cached,
// so the next visit tries the AI again.

import { createHash } from 'node:crypto';

export const AI_CALLS_PER_HOUR = 12;
const HOUR_MS = 60 * 60 * 1000;
const TTL_MS = 12 * HOUR_MS;
const MAX_ENTRIES = 500;

export function planKey(userId: string, context: unknown): string {
  return createHash('sha256').update(userId).update('\u0000').update(JSON.stringify(context)).digest('hex');
}

export class PlanCache<T> {
  private entries = new Map<string, { at: number; value: T }>();
  private pending = new Map<string, Promise<T>>();
  private calls = new Map<string, number[]>();

  constructor(private now: () => number = Date.now) {}

  get(key: string): T | null {
    const e = this.entries.get(key);
    if (!e) return null;
    if (this.now() - e.at > TTL_MS) {
      this.entries.delete(key);
      return null;
    }
    return e.value;
  }

  set(key: string, value: T): void {
    if (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { at: this.now(), value });
  }

  /** Shares one in-flight computation per key. */
  once(key: string, compute: () => Promise<T>): Promise<T> {
    const running = this.pending.get(key);
    if (running) return running;
    const p = compute().finally(() => this.pending.delete(key));
    this.pending.set(key, p);
    return p;
  }

  /** Records a model call for this user if under the hourly limit. */
  takeAiCall(userId: string): boolean {
    const now = this.now();
    const recent = (this.calls.get(userId) ?? []).filter((t) => now - t < HOUR_MS);
    if (recent.length >= AI_CALLS_PER_HOUR) {
      this.calls.set(userId, recent);
      return false;
    }
    recent.push(now);
    this.calls.set(userId, recent);
    return true;
  }
}
