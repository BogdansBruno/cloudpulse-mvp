// lib/school-view.ts
//
// School (nurse / administrator) screen logic. Data comes from school_overview() and
// school_exam_load() (supabase/sql/16_school_role.sql). Pure functions only; unit-tested in
// school-view.test.ts.
//
// What the school can get, and only with the pupil's own switches:
//   safety consent   → was there a check-in today, the colour of the day, "load restricted",
//                      and "reported pain today". Never the score, the answers, WHERE it hurts,
//                      ACWR or the trainings.
//   calendar consent → the number of pupils with a test on a day — only when 3 or more share it.
// The status is a signal to talk to the pupil and to the school nurse. It is not a diagnosis and
// not a medical record; with pain the only advice is "doctor, school nurse or physio decides".

export type Zone = 'green' | 'yellow' | 'red';

/** Display state of one pupil, from most to least urgent. */
export type SchoolState = 'pain' | 'red' | 'restricted' | 'yellow' | 'no_checkin' | 'green' | 'locked';

export type SchoolRow = {
  label: string;
  consent: boolean;
  checkedIn: boolean;
  zone: Zone | null;
  restricted: boolean;
  pain: boolean;
};

export type ExamDay = { day: string; athletes: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isZone(v: unknown): v is Zone {
  return v === 'green' || v === 'yellow' || v === 'red';
}
function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** One row of school_overview(). Without consent every status field is null → "locked". */
export function parseSchoolRow(raw: unknown): SchoolRow | null {
  const r = obj(raw);
  if (!r || typeof r.athlete_label !== 'string' || r.athlete_label.trim() === '') return null;
  const consent = r.consent === true;
  return {
    label: r.athlete_label.trim(),
    consent,
    checkedIn: consent && r.checked_in === true,
    zone: consent && isZone(r.zone) ? r.zone : null,
    restricted: consent && r.restricted === true,
    pain: consent && r.pain === true,
  };
}

/** One row of school_exam_load(). Rows below 3 pupils are never sent by the database; this drops them too. */
export function parseExamDay(raw: unknown): ExamDay | null {
  const r = obj(raw);
  if (!r || typeof r.day !== 'string' || !DATE_RE.test(r.day)) return null;
  const n = typeof r.athletes === 'number' ? r.athletes : Number(r.athletes);
  if (!Number.isFinite(n) || n < 3) return null;
  return { day: r.day, athletes: Math.floor(n) };
}

export function stateOf(row: SchoolRow): SchoolState {
  if (!row.consent) return 'locked';
  if (row.pain) return 'pain';
  if (!row.checkedIn) return 'no_checkin';
  if (row.zone === 'red') return 'red';
  if (row.restricted) return 'restricted';
  if (row.zone === 'yellow') return 'yellow';
  return 'green';
}

const ORDER: Record<SchoolState, number> = { pain: 0, red: 1, restricted: 2, yellow: 3, no_checkin: 4, green: 5, locked: 6 };

/** Most urgent first; the database already sorts, this keeps the page right if it ever changes. */
export function sortRows(rows: SchoolRow[]): SchoolRow[] {
  return [...rows].sort((a, b) => ORDER[stateOf(a)] - ORDER[stateOf(b)] || a.label.localeCompare(b.label));
}

export type SchoolCounts = Record<SchoolState, number>;

export function countStates(rows: SchoolRow[]): SchoolCounts {
  const c: SchoolCounts = { pain: 0, red: 0, restricted: 0, yellow: 0, no_checkin: 0, green: 0, locked: 0 };
  for (const r of rows) c[stateOf(r)] += 1;
  return c;
}

/** The headline banner is shown only when somebody needs attention (pain, red day or restriction). */
export function needsAttention(c: SchoolCounts): number {
  return c.pain + c.red + c.restricted;
}

/** Colour of a state for the chip (hex, same palette as the rest of the app). */
export const STATE_COLOR: Record<SchoolState, string> = {
  pain: '#FF3D5A',
  red: '#FF5C6C',
  restricted: '#FF7A59',
  yellow: '#FFC53D',
  no_checkin: '#9AA7B8',
  green: '#B8F23C',
  locked: '#9AA7B8',
};
