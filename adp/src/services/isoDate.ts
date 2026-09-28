// adp/src/services/isoDate.ts
//
// Calendar-day helpers on 'YYYY-MM-DD' strings in UTC — the same convention
// CloudPulse's /api/checkin uses, so "today" agrees across the system.

import type { IsoDate } from '../types/adp';

const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayUtc(now: Date = new Date()): IsoDate {
  return now.toISOString().slice(0, 10);
}

/** A real calendar day ('2026-02-30' is not). */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === value;
}

export function addDays(day: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}
