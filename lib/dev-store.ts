import fs from 'fs';
import path from 'path';
import type { SessionEntry, DailyCheckin, UserContext } from './readiness-engine';
import type { TrainingScheduleEntry, InjuryRecord } from './types/readiness';

export type DevProfile = {
  age: number | null;
  sport: string | null;
  trainingSchedule: TrainingScheduleEntry[];
  injuryHistory: InjuryRecord[];
};

export type DevStoreData = {
  checkins: DailyCheckin[];
  sessions: SessionEntry[];
  profile: DevProfile;
  context: UserContext;
};

const STORE_PATH = path.join(process.cwd(), '.dev-store.json');

function emptyStore(): DevStoreData {
  return {
    checkins: [],
    sessions: [],
    profile: { age: null, sport: null, trainingSchedule: [], injuryHistory: [] },
    context: { examDates: [], matchDates: [] },
  };
}

/**
 * Disk-backed dev-mode store — NOT a plain in-memory singleton.
 *
 * WHY: Next.js's dev server (Turbopack/HMR) reloads route modules whenever
 * ANY file in the project changes, including files that have nothing to do
 * with this store. A plain `const store = {...}` module-level singleton
 * gets silently wiped by that reload, so a profile saved via /api/profile
 * could vanish before the next /api/checkin call — not because of a
 * logic bug, but because someone edited an unrelated component in
 * between. Caught live: exam-date penalty tested as missing, root cause
 * was the singleton resetting mid-session, not the engine.
 *
 * A small JSON file on disk survives HMR reloads because it isn't JS
 * module state. Dev-only — add `.dev-store.json` to .gitignore. This
 * entire file is removed once real Supabase Auth is wired into the UI
 * (see the devMode checks in the API routes).
 */
export function loadDevStore(): DevStoreData {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

export function saveDevStore(data: DevStoreData): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[dev-store] failed to persist:', err);
  }
}
