// supabase/functions/get-readiness/index.ts
//
// Шаг 3 (адаптировано под реальную схему). Заменяет get-readiness/index.ts.
// Логика идентична — перенос lib/readiness-engine.ts (monotony, training
// streak, inconsistency flags — то, чего нет в SQL-триггере compute_readiness()
// из cloudpulse_schema_retrofit.sql). Изменились только имена колонок/таблиц:
//   checkins:     user_id, date, sleep_quality, stress, fatigue, soreness,
//                 pain_flag, pain_zone   (было: athlete_id, checkin_date, ...)
//   sessions_log: user_id, date, rpe, duration_minutes   (было: trainings)
//   exam_dates / match_dates читаются из profiles (были: отдельная таблица
//   academic_events, которой в реальной базе нет и не нужно).
//
// athlete_id по-прежнему никогда не берётся из тела запроса — только из
// проверенного JWT (auth.getUser()) или, для тренера, через team_members.

import { createClient } from 'npm:@supabase/supabase-js@2';

// ---- Типы, идентичные lib/readiness-engine.ts ------------------------------
type SessionEntry = { date: string; rpe: number; durationMinutes: number };
type DailyCheckin = {
  date: string;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  soreness: number;
  painFlag: boolean;
  painZone?: string;
};
type UserContext = { examDates?: string[]; matchDates?: string[] };
type ReadinessZone = 'green' | 'yellow' | 'red';
type Penalty = { reason: string; points: number };

// ---- Чистые функции движка — без изменений относительно lib/readiness-engine.ts
const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function sessionLoad(rpe: number, durationMinutes: number): number {
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

const MIN_ACWR_HISTORY_DAYS = 7;

function calculateACWR(sessions: SessionEntry[], today: string) {
  const acute = windowLoad(sessions, today, 7);
  const chronic = windowLoad(sessions, today, 28) / 4;
  if (chronic === 0) return { acute, chronic, acwr: null as number | null };
  const earliestDate = sessions.reduce((min, s) => (s.date < min ? s.date : min), today);
  const historyDays = daysBetween(earliestDate, today) + 1;
  if (historyDays < MIN_ACWR_HISTORY_DAYS) return { acute, chronic, acwr: null as number | null };
  return { acute, chronic, acwr: acute / chronic };
}

function calculateMonotony(sessions: SessionEntry[], today: string): number | null {
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

function calculateHooperIndex(checkin: DailyCheckin): number {
  const invert = (v: number) => 8 - v;
  return invert(checkin.sleepQuality) + invert(checkin.stress) + invert(checkin.fatigue) + invert(checkin.soreness);
}

function calculateHooperBaseline(checkins: DailyCheckin[], today: string): number | null {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = isoDate(cutoff);
  const inWindow = checkins.filter((c) => c.date >= cutoffStr && c.date < today);
  if (inWindow.length < 3) return null;
  const total = inWindow.reduce((sum, c) => sum + calculateHooperIndex(c), 0);
  return total / inWindow.length;
}

function calculateTrainingStreak(sessions: SessionEntry[], today: string, lookbackDays = 21): number {
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

function detectInconsistency(checkin: DailyCheckin, acwr: number | null, trainingStreak: number): string[] {
  const flags: string[] = [];
  if (checkin.fatigue >= 6 && acwr !== null && acwr > 1.5) {
    flags.push(`Самооценка усталости низкая (${checkin.fatigue}/7), но ACWR = ${acwr.toFixed(2)}.`);
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

function calculateReadiness(
  sessions: SessionEntry[],
  checkins: DailyCheckin[],
  today: string,
  context: UserContext = {}
) {
  const todayCheckin = checkins.find((c) => c.date === today);
  const { acute, chronic, acwr } = calculateACWR(sessions, today);
  const monotony = calculateMonotony(sessions, today);
  const hooperScore = todayCheckin ? calculateHooperIndex(todayCheckin) : 0;
  const hooperBaseline = calculateHooperBaseline(checkins, today);
  const trainingStreak = calculateTrainingStreak(sessions, today);

  const penalties: Penalty[] = [];
  if (acwr !== null) {
    if (acwr > 1.5) penalties.push({ reason: `ACWR ${acwr.toFixed(2)} — резкий скачок нагрузки`, points: 35 });
    else if (acwr > 1.3) penalties.push({ reason: `ACWR ${acwr.toFixed(2)} — нагрузка растёт быстрее обычного`, points: 15 });
    else if (acwr < 0.8) penalties.push({ reason: `ACWR ${acwr.toFixed(2)} — нагрузка заметно ниже обычной`, points: 10 });
  }
  if (hooperBaseline !== null && hooperScore > hooperBaseline) {
    const diff = hooperScore - hooperBaseline;
    const points = Math.min(25, Math.round(diff * 4));
    if (points > 0) {
      penalties.push({ reason: `Самочувствие хуже обычного (${hooperScore} против базы ${hooperBaseline.toFixed(1)})`, points });
    }
  }
  if (trainingStreak > 6) {
    penalties.push({ reason: `${trainingStreak} дней подряд без отдыха`, points: Math.min(20, (trainingStreak - 6) * 5) });
  }
  if (isNearExam(today, context.examDates)) {
    penalties.push({ reason: 'Экзамен в ближайшие 3 дня', points: 15 });
  }
  if (monotony !== null && monotony > 2.0) {
    penalties.push({ reason: `Однообразная нагрузка (${monotony.toFixed(2)})`, points: 10 });
  }

  const totalPenalty = penalties.reduce((sum, p) => sum + p.points, 0);
  let score = Math.max(0, 100 - totalPenalty);
  const isPainBlocked = todayCheckin?.painFlag === true;
  if (isPainBlocked) score = Math.min(score, 30);
  const zone: ReadinessZone = isPainBlocked || score < 50 ? 'red' : score < 75 ? 'yellow' : 'green';
  const inconsistencyFlags = todayCheckin ? detectInconsistency(todayCheckin, acwr, trainingStreak) : [];

  return {
    score, zone, acwr, acuteLoad: acute, chronicLoad: chronic, monotony,
    hooperScore, hooperBaseline, trainingStreak, penalties, inconsistencyFlags, isPainBlocked,
  };
}

function detectSafetyViolations(
  checkin: DailyCheckin | undefined,
  today: string,
  context: UserContext = {}
) {
  const violations: { code: string; message: string; severity: 'block' | 'warning' }[] = [];
  if (checkin?.painFlag) {
    const zone = checkin.painZone ? ` (зона: ${checkin.painZone})` : '';
    violations.push({
      code: 'PAIN_REPORTED',
      message: `Заявлена боль${zone}. Силовые и высокоинтенсивные упражнения заблокированы. Показаться врачу/физиотерапевту.`,
      severity: 'block',
    });
  }
  for (const matchDate of context.matchDates ?? []) {
    const diff = daysBetween(today, matchDate);
    if (diff === 0) violations.push({ code: 'MATCH_DAY', message: 'Сегодня матч — только разминка, без силовой.', severity: 'block' });
    else if (diff === 1) violations.push({ code: 'PRE_MATCH', message: 'Завтра матч — тяжёлая силовая под запретом.', severity: 'block' });
    else if (diff === -1) violations.push({ code: 'POST_MATCH', message: 'Вчера был матч — сегодня восстановление, не силовая.', severity: 'block' });
  }
  return violations;
}

// ---- HTTP-обвязка -----------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = userData.user.id;

    const url = new URL(req.url);
    const requestedUserId = url.searchParams.get('athlete_id') ?? callerId;

    if (requestedUserId !== callerId) {
      const { data: link } = await supabase
        .from('team_members')
        .select('id')
        .eq('coach_id', callerId)
        .eq('athlete_id', requestedUserId)
        .maybeSingle();
      if (!link) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const today = isoDate(new Date());
    const windowStart = isoDate(new Date(Date.now() - 28 * DAY_MS));

    // sessions_log без верхней границы даты естественно захватит и будущие
    // матчи — но матчи мы всё равно берём не отсюда, а из profiles.match_dates
    // (см. ниже), как и compute_readiness() в схеме БД.
    const [{ data: sessionRows, error: sessionsErr }, { data: checkinRows, error: checkinsErr }, { data: profileRow, error: profileErr }] =
      await Promise.all([
        supabase
          .from('sessions_log')
          .select('date, rpe, duration_minutes')
          .eq('user_id', requestedUserId)
          .gte('date', windowStart),
        supabase
          .from('checkins')
          .select('date, sleep_quality, stress, fatigue, soreness, pain_flag, pain_zone')
          .eq('user_id', requestedUserId)
          .gte('date', isoDate(new Date(Date.now() - 21 * DAY_MS))),
        supabase
          .from('profiles')
          .select('exam_dates, match_dates')
          .eq('id', requestedUserId)
          .maybeSingle(),
      ]);

    if (sessionsErr || checkinsErr || profileErr) {
      console.error('[get-readiness] db error:', sessionsErr ?? checkinsErr ?? profileErr);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessions: SessionEntry[] = (sessionRows ?? []).map((r) => ({
      date: r.date,
      rpe: r.rpe,
      durationMinutes: r.duration_minutes,
    }));
    const checkins: DailyCheckin[] = (checkinRows ?? []).map((r) => ({
      date: r.date,
      sleepQuality: r.sleep_quality,
      stress: r.stress,
      fatigue: r.fatigue,
      soreness: r.soreness,
      painFlag: r.pain_flag,
      painZone: r.pain_zone ?? undefined,
    }));
    const context: UserContext = {
      examDates: (profileRow?.exam_dates ?? []) as string[],
      matchDates: (profileRow?.match_dates ?? []) as string[],
    };

    const todayCheckin = checkins.find((c) => c.date === today);
    const readiness = calculateReadiness(sessions, checkins, today, context);
    const safetyViolations = detectSafetyViolations(todayCheckin, today, context);

    return new Response(
      JSON.stringify({ hasCheckin: !!todayCheckin, readiness, safetyViolations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[get-readiness] error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});