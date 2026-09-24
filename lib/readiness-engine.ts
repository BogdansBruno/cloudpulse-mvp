// lib/readiness-engine.ts
//
// Deterministic, ML-free load-management engine for CloudPulse.
// Takes daily check-ins + session history and outputs a Readiness Score.
//
// IMPORTANT: this module contains ZERO calls to Claude / any LLM.
// Every number here is reproducible and explainable on a whiteboard.
// The AI layer (claude-agent.ts) only explains and contextualizes the
// output of this engine in natural language — it never overrides it.
//
// Method references (cite these on the jury slide):
// - sRPE / session training load: Foster et al., 2001
// - ACWR (Acute:Chronic Workload Ratio): Gabbett, 2016
//   (known critique: Impellizzeri et al., 2020 — we treat ACWR as a
//   screening flag, not a diagnosis, which is why it's one signal among
//   several below, not the sole trigger)
// - Hooper Index (subjective wellness questionnaire): Hooper et al., 1995

export type SessionEntry = {
  date: string; // ISO yyyy-mm-dd
  rpe: number; // 1-10, session RPE (perceived effort)
  durationMinutes: number;
};

export type DailyCheckin = {
  date: string; // ISO yyyy-mm-dd
  sleepQuality: number; // 1-7 (1 = terrible, 7 = great)
  stress: number; // 1-7 (1 = very stressed, 7 = calm) — see note in calculateHooperIndex
  fatigue: number; // 1-7 (1 = exhausted, 7 = fresh)
  soreness: number; // 1-7 (1 = very sore, 7 = no soreness)
  painFlag: boolean;
  painZone?: string;
};

export type UserContext = {
  examDates?: string[]; // ISO dates — exam stress window
  matchDates?: string[]; // ISO dates — match days (used by safety-guard, not this engine)
};

export type ReadinessZone = 'green' | 'yellow' | 'red';

export type Penalty = { reason: string; points: number };

export type ReadinessResult = {
  score: number; // 0-100
  zone: ReadinessZone;
  acwr: number | null;
  acuteLoad: number;
  chronicLoad: number; // average weekly load over trailing 28 days
  monotony: number | null;
  hooperScore: number; // 4-28, higher = worse
  hooperBaseline: number | null;
  trainingStreak: number; // consecutive days with a session, ending today
  penalties: Penalty[];
  inconsistencyFlags: string[];
  isPainBlocked: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Positive when b is after a, negative when b is before a. Both ISO yyyy-mm-dd. */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Session load in arbitrary units (AU), per Foster's sRPE method. */
export function sessionLoad(rpe: number, durationMinutes: number): number {
  return rpe * durationMinutes;
}

function windowLoad(sessions: SessionEntry[], today: string, windowDays: number): number {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - windowDays + 1);
  const cutoffStr = isoDate(cutoff);

  return sessions
    .filter((s) => s.date >= cutoffStr && s.date <= today)
    .reduce((sum, s) => sum + sessionLoad(s.rpe, s.durationMinutes), 0);
}

// ACWR needs a minimum stretch of history before it means anything.
// Sports-science practice generally wants 2-4 weeks of chronic data before
// trusting the ratio; we use a pragmatic 7-day MVP floor. Below that,
// acute and chronic are computed from almost the same handful of
// sessions, which mathematically forces ACWR toward a fixed multiple
// (e.g. exactly 4.0 for a single ever-logged session) — a false "danger"
// signal that has nothing to do with real training load. Caught live
// during testing: a brand-new user's very first workout produced ACWR=4.
const MIN_ACWR_HISTORY_DAYS = 7;

/**
 * Acute:Chronic Workload Ratio.
 * acute   = total load, last 7 days
 * chronic = average WEEKLY load, last 28 days
 * Returns null when there isn't enough history yet — either no load at
 * all (chronic = 0), or fewer than MIN_ACWR_HISTORY_DAYS days have
 * elapsed since the athlete's first logged session. Callers must treat
 * null as "no penalty, not enough data" rather than 0.
 */
export function calculateACWR(
  sessions: SessionEntry[],
  today: string
): { acute: number; chronic: number; acwr: number | null } {
  const acute = windowLoad(sessions, today, 7);
  const chronic = windowLoad(sessions, today, 28) / 4;

  if (chronic === 0) {
    return { acute, chronic, acwr: null };
  }

  const earliestDate = sessions.reduce((min, s) => (s.date < min ? s.date : min), today);
  const historyDays = daysBetween(earliestDate, today) + 1;
  if (historyDays < MIN_ACWR_HISTORY_DAYS) {
    return { acute, chronic, acwr: null };
  }

  return { acute, chronic, acwr: acute / chronic };
}

/**
 * Monotony = mean daily load / stddev daily load over the trailing 7 days.
 * High monotony (same load every day, little variation) correlates with
 * higher injury/illness risk even when the load itself looks safe.
 * Returns null when there's no load in the window, or the window is
 * perfectly flat (stddev 0 — e.g. all zeros), since the ratio is undefined.
 */
export function calculateMonotony(sessions: SessionEntry[], today: string): number | null {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 6);

  const dailyTotals: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    const dStr = isoDate(d);
    const dayLoad = sessions
      .filter((s) => s.date === dStr)
      .reduce((sum, s) => sum + sessionLoad(s.rpe, s.durationMinutes), 0);
    dailyTotals.push(dayLoad);
  }

  const mean = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
  if (mean === 0) return null;

  const variance = dailyTotals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / dailyTotals.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return null;

  return mean / stddev;
}

/**
 * Hooper Index: sum of 4 subjective wellness scores, 1-7 each. Range 4-28.
 * NOTE on direction: our check-in UI asks sleep/stress/fatigue/soreness on
 * a "higher = better" 1-7 scale (matches how teenagers intuitively answer
 * "how good was your sleep"). The classic Hooper Index is "higher = worse".
 * We flip it here so the rest of the engine can stay in one direction:
 * this function returns a WORSE-IS-HIGHER score (28 - rawSum + 4)...
 * actually simplest: invert each field before summing.
 */
export function calculateHooperIndex(checkin: DailyCheckin): number {
  const invert = (v: number) => 8 - v; // 1-7 "higher=better" -> 7-1 "higher=worse"
  return (
    invert(checkin.sleepQuality) +
    invert(checkin.stress) +
    invert(checkin.fatigue) +
    invert(checkin.soreness)
  );
}

/** Rolling baseline: mean Hooper score over the trailing 14 days, excluding today. */
export function calculateHooperBaseline(checkins: DailyCheckin[], today: string): number | null {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = isoDate(cutoff);

  const inWindow = checkins.filter((c) => c.date >= cutoffStr && c.date < today);
  if (inWindow.length < 3) return null; // need at least 3 points for a meaningful baseline

  const total = inWindow.reduce((sum, c) => sum + calculateHooperIndex(c), 0);
  return total / inWindow.length;
}

/** Length of the current consecutive training streak (no rest day), ending today. */
export function calculateTrainingStreak(sessions: SessionEntry[], today: string, lookbackDays = 21): number {
  let streak = 0;
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const hasSession = sessions.some((s) => s.date === isoDate(d));
    if (!hasSession) break;
    streak++;
  }
  return streak;
}

/**
 * Flags cases where the athlete's self-report contradicts objective load
 * data — teenagers systematically under-report fatigue because they want
 * to play. This does NOT change the score; it's surfaced to the AI layer
 * so it can ask a follow-up question instead of silently trusting either
 * signal.
 */
export function detectInconsistency(
  checkin: DailyCheckin,
  acwr: number | null,
  trainingStreak: number
): string[] {
  const flags: string[] = [];

  if (checkin.fatigue >= 6 && acwr !== null && acwr > 1.5) {
    flags.push(
      `Самооценка усталости низкая (${checkin.fatigue}/7 = "почти свеж"), но ACWR = ${acwr.toFixed(2)} — острая нагрузка резко выше обычной.`
    );
  }

  if (checkin.fatigue >= 6 && trainingStreak >= 7) {
    flags.push(`Самооценка усталости низкая, но это ${trainingStreak}-й день подряд без отдыха.`);
  }

  return flags;
}

const EXAM_WINDOW_DAYS = 3;

function isNearExam(today: string, examDates: string[] = []): boolean {
  return examDates.some((exam) => {
    const diff = daysBetween(today, exam);
    return diff >= 0 && diff <= EXAM_WINDOW_DAYS;
  });
}

/**
 * Main entry point. Combines all signals into a single 0-100 Readiness
 * Score and a traffic-light zone. This is the ONLY function the rest of
 * the app should call — everything above is exported mainly for unit
 * testing and for the jury demo (show the ACWR chart, not just the score).
 */
export function calculateReadiness(
  sessions: SessionEntry[],
  checkins: DailyCheckin[],
  today: string,
  context: UserContext = {}
): ReadinessResult {
  const todayCheckin = checkins.find((c) => c.date === today);

  const { acute, chronic, acwr } = calculateACWR(sessions, today);
  const monotony = calculateMonotony(sessions, today);
  const hooperScore = todayCheckin ? calculateHooperIndex(todayCheckin) : 0;
  const hooperBaseline = calculateHooperBaseline(checkins, today);
  const trainingStreak = calculateTrainingStreak(sessions, today);

  const penalties: Penalty[] = [];

  if (acwr !== null) {
    if (acwr > 1.5) {
      penalties.push({ reason: `ACWR ${acwr.toFixed(2)} — резкий скачок нагрузки (риск травмы)`, points: 35 });
    } else if (acwr > 1.3) {
      penalties.push({ reason: `ACWR ${acwr.toFixed(2)} — нагрузка растёт быстрее обычного`, points: 15 });
    } else if (acwr < 0.8) {
      penalties.push({ reason: `ACWR ${acwr.toFixed(2)} — нагрузка заметно ниже обычной`, points: 10 });
    }
  }

  if (hooperBaseline !== null && hooperScore > hooperBaseline) {
    const diff = hooperScore - hooperBaseline;
    const points = Math.min(25, Math.round(diff * 4));
    if (points > 0) {
      penalties.push({
        reason: `Самочувствие хуже обычного (индекс ${hooperScore} против базы ${hooperBaseline.toFixed(1)})`,
        points,
      });
    }
  }

  if (trainingStreak > 6) {
    const points = Math.min(20, (trainingStreak - 6) * 5);
    penalties.push({ reason: `${trainingStreak} дней подряд без отдыха`, points });
  }

  if (isNearExam(today, context.examDates)) {
    penalties.push({ reason: 'Экзамен в ближайшие 3 дня', points: 15 });
  }

  if (monotony !== null && monotony > 2.0) {
    penalties.push({ reason: `Однообразная нагрузка (монотонность ${monotony.toFixed(2)})`, points: 10 });
  }

  const totalPenalty = penalties.reduce((sum, p) => sum + p.points, 0);
  let score = Math.max(0, 100 - totalPenalty);

  const isPainBlocked = todayCheckin?.painFlag === true;
  if (isPainBlocked) {
    score = Math.min(score, 30); // pain always forces red-range score, whatever else looks fine
  }

  const zone: ReadinessZone = isPainBlocked || score < 50 ? 'red' : score < 75 ? 'yellow' : 'green';

  const inconsistencyFlags = todayCheckin
    ? detectInconsistency(todayCheckin, acwr, trainingStreak)
    : [];

  return {
    score,
    zone,
    acwr,
    acuteLoad: acute,
    chronicLoad: chronic,
    monotony,
    hooperScore,
    hooperBaseline,
    trainingStreak,
    penalties,
    inconsistencyFlags,
    isPainBlocked,
  };
}

// ---------------------------------------------------------------------------
// Safety Guard — hard rules, separate from the Readiness Score.
//
// The score is a graded 0-100 signal that shapes HOW MUCH to train.
// Safety violations below are binary, non-negotiable BLOCKS on WHAT TYPE
// of training is allowed today, regardless of how high the score is.
// A perfect 95 score the day before a match still blocks heavy squats.
// ---------------------------------------------------------------------------

export type SafetyViolationCode =
  | 'PAIN_REPORTED'
  | 'MATCH_DAY'
  | 'PRE_MATCH'
  | 'POST_MATCH';

export type SafetyViolation = {
  code: SafetyViolationCode;
  message: string;
  /** 'block' = heavy/strength work is forbidden today. 'warning' = shown to the user, training still allowed. */
  severity: 'block' | 'warning';
};

/**
 * Deterministic hard rules — no score, no weighting, just yes/no checks.
 * Called independently of calculateReadiness() so a UI can show
 * "Readiness: 88 (green)" AND "но сегодня матч — силовых нет" at the
 * same time without one system silently overriding the other.
 */
export function detectSafetyViolations(
  checkin: DailyCheckin | undefined,
  today: string,
  context: UserContext = {}
): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  if (checkin?.painFlag) {
    const zone = checkin.painZone ? ` (зона: ${checkin.painZone})` : '';
    violations.push({
      code: 'PAIN_REPORTED',
      message: `Заявлена боль${zone}. Силовые и высокоинтенсивные упражнения на сегодня заблокированы. Рекомендация: показаться врачу, школьной медсестре или физиотерапевту — не гадать самостоятельно.`,
      severity: 'block',
    });
  }

  for (const matchDate of context.matchDates ?? []) {
    const diff = daysBetween(today, matchDate);
    if (diff === 0) {
      violations.push({
        code: 'MATCH_DAY',
        message: 'Сегодня день матча — только активация и лёгкая разминка, без силовой работы.',
        severity: 'block',
      });
    } else if (diff === 1) {
      violations.push({
        code: 'PRE_MATCH',
        message: 'Завтра матч — тяжёлые силовые и высокоинтенсивные интервалы под запретом, только техника и лёгкий объём.',
        severity: 'block',
      });
    } else if (diff === -1) {
      violations.push({
        code: 'POST_MATCH',
        message: 'Вчера был матч — сегодня восстановление (растяжка, лёгкое кардио), не силовая.',
        severity: 'block',
      });
    }
  }

  return violations;
}
