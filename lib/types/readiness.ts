// lib/types/readiness.ts
//
// API-facing contracts (request/response shapes) for the readiness system.
// These are separate from the pure domain types in lib/readiness-engine.ts
// on purpose: engine types describe the MATH (SessionEntry, DailyCheckin,
// ReadinessResult), these describe the WIRE FORMAT of our own API routes.
// Keeping them apart means the engine can be reused (e.g. in a coach
// dashboard aggregation job) without dragging HTTP-shape assumptions along.

import type { ReadinessZone, Penalty, SafetyViolation } from '@/lib/readiness-engine';

// ---- POST /api/checkin ----------------------------------------------------

export type CheckinRequestBody = {
  date?: string; // ISO yyyy-mm-dd, defaults to today server-side
  sleepQuality: number; // 1-7
  stress: number; // 1-7
  fatigue: number; // 1-7
  soreness: number; // 1-7
  painFlag: boolean;
  painZone?: string;
  session?: {
    rpe: number; // 1-10
    durationMinutes: number;
  };
};

export type CheckinResponseBody = {
  checkin: {
    date: string;
    sleepQuality: number;
    stress: number;
    fatigue: number;
    soreness: number;
    painFlag: boolean;
    painZone?: string;
  };
  readiness: {
    score: number;
    zone: ReadinessZone;
    acwr: number | null;
    acuteLoad: number;
    chronicLoad: number;
    monotony: number | null;
    hooperScore: number;
    hooperBaseline: number | null;
    trainingStreak: number;
    penalties: Penalty[];
    inconsistencyFlags: string[];
    isPainBlocked: boolean;
  };
  safetyViolations: SafetyViolation[];
};

// ---- GET /api/checkin?days=N ----------------------------------------------

export type ReadinessHistoryPoint = {
  date: string;
  score: number;
  zone: ReadinessZone;
  acwr: number | null;
  acuteLoad: number;
  chronicLoad: number;
  monotony: number | null;
  hooperScore: number;
  trainingStreak: number;
  hasCheckin: boolean;
  sleepQuality: number | null;
  stress: number | null;
  fatigue: number | null;
  soreness: number | null;
};

export type ReadinessHistoryResponse = {
  history: ReadinessHistoryPoint[];
};

// ---- POST /api/profile (onboarding) ---------------------------------------

export type TrainingScheduleEntry = {
  dayOfWeek: number; // 0=Sunday .. 6=Saturday
  durationMinutes: number;
};

export type InjuryRecord = {
  zone: string;
  date?: string; // ISO, approximate is fine
  note?: string;
};

export type ProfileRequestBody = {
  age?: number;
  sport?: string;
  trainingSchedule?: TrainingScheduleEntry[];
  matchDates?: string[]; // ISO dates
  examDates?: string[]; // ISO dates
  injuryHistory?: InjuryRecord[];
};

export type ProfileResponseBody = {
  profile: {
    age: number | null;
    sport: string | null;
    trainingSchedule: TrainingScheduleEntry[];
    matchDates: string[];
    examDates: string[];
    injuryHistory: InjuryRecord[];
  };
};
