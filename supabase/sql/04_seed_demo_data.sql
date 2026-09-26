-- ============================================================================
-- CloudPulse — демо-команда для жюри (4 архетипа, история до 28 дней)
-- ============================================================================
-- Что делает:
--   1. Находит 4 демо-аккаунта по email (их нужно один раз создать вручную:
--      Supabase → Authentication → Users → Add user → Create new user,
--      с галочкой "Auto Confirm User").
--   2. Удаляет их старые демо-данные и создаёт заново. Скрипт можно
--      запускать сколько угодно раз.
--   3. Создаёт профили, привязывает атлетов к тренеру, заливает тренировки
--      и чек-ины. Балл readiness считает триггер v2 — те же формулы, что в
--      приложении. Никаких вручную вписанных баллов.
--
-- Все даты — относительно СЕГОДНЯ. Утром в день презентации запусти скрипт
-- заново, иначе окна ACWR сдвинутся.
--
-- Ожидаемый результат на /coach (проверено на движке приложения):
--   Звезда в зоне риска — 7 / red: ACWR 2.03, экзамен сегодня, 9 дней без
--       отдыха, самочувствие хуже нормы + флаг "занижает усталость"
--   Скрытая травма      — 30 / red: боль (колено) + завтра матч
--   Идеальная форма     — 100 / green: ACWR 1.00
--   Новичок             — 100 / green: ACWR "мало данных" (cold start)
-- ============================================================================

BEGIN;

-- Тренер, к которому привязывается демо-команда: единственный аккаунт с
-- ролью coach (email в файл не вписываем — файл лежит в git).
CREATE TEMP TABLE _demo_coach ON COMMIT DROP AS
  SELECT id FROM profiles WHERE role = 'coach';

CREATE TEMP TABLE _demo_athletes (
  email TEXT, team_name TEXT, age INT, sport TEXT, exam_dates DATE[], match_dates DATE[]
) ON COMMIT DROP;

INSERT INTO _demo_athletes VALUES
  ('demo.star@cloudpulse.test', 'Демо · Звезда в зоне риска', 17, 'basketball', ARRAY[CURRENT_DATE + 0]::date[], ARRAY[]::date[]),
  ('demo.injury@cloudpulse.test', 'Демо · Скрытая травма', 16, 'football', ARRAY[]::date[], ARRAY[CURRENT_DATE + 1]::date[]),
  ('demo.ideal@cloudpulse.test', 'Демо · Идеальная форма', 17, 'athletics', ARRAY[]::date[], ARRAY[]::date[]),
  ('demo.rookie@cloudpulse.test', 'Демо · Новичок', 15, 'swimming', ARRAY[]::date[], ARRAY[]::date[]);

-- Проверка: все аккаунты существуют.
DO $$
DECLARE
  v_missing TEXT;
BEGIN
  IF (SELECT count(*) FROM _demo_coach) <> 1 THEN
    RAISE EXCEPTION 'Нужен ровно один аккаунт с role = coach, найдено: %', (SELECT count(*) FROM _demo_coach);
  END IF;
  SELECT string_agg(a.email, ', ') INTO v_missing
    FROM _demo_athletes a LEFT JOIN auth.users u ON u.email = a.email
   WHERE u.id IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Сначала создай демо-аккаунты в Authentication → Users: %', v_missing;
  END IF;
END $$;

CREATE TEMP TABLE _demo_ids ON COMMIT DROP AS
  SELECT u.id, a.* FROM _demo_athletes a JOIN auth.users u ON u.email = a.email;

-- ----------------------------------------------------------------------------
-- Очистка старых демо-данных (только этих 4 аккаунтов).
-- ----------------------------------------------------------------------------
DELETE FROM checkins     WHERE user_id IN (SELECT id FROM _demo_ids);
DELETE FROM sessions_log WHERE user_id IN (SELECT id FROM _demo_ids);
DELETE FROM team_members WHERE athlete_id IN (SELECT id FROM _demo_ids);
-- Тестовая связь тренера с самим собой больше не нужна.
DELETE FROM team_members WHERE coach_id = athlete_id AND coach_id IN (SELECT id FROM _demo_coach);

-- ----------------------------------------------------------------------------
-- Профили и привязка к тренеру.
-- ----------------------------------------------------------------------------
INSERT INTO profiles (id, role, age, sport, exam_dates, match_dates, training_schedule, injury_history)
SELECT id, 'athlete', age, sport, exam_dates, match_dates, '[]', '[]' FROM _demo_ids
ON CONFLICT (id) DO UPDATE
  SET role = 'athlete', age = EXCLUDED.age, sport = EXCLUDED.sport,
      exam_dates = EXCLUDED.exam_dates, match_dates = EXCLUDED.match_dates;

INSERT INTO team_members (coach_id, athlete_id, team_name)
SELECT c.id, d.id, d.team_name FROM _demo_ids d CROSS JOIN _demo_coach c;

-- ----------------------------------------------------------------------------
-- Тренировки (email, день относительно сегодня, RPE 1-10, минуты).
-- ----------------------------------------------------------------------------
INSERT INTO sessions_log (user_id, date, rpe, duration_minutes)
SELECT d.id, CURRENT_DATE + s.off, s.rpe, s.mins
  FROM (VALUES
  ('demo.star@cloudpulse.test', -27, 5, 60),
  ('demo.star@cloudpulse.test', -26, 6, 45),
  ('demo.star@cloudpulse.test', -24, 5, 60),
  ('demo.star@cloudpulse.test', -22, 6, 60),
  ('demo.star@cloudpulse.test', -20, 5, 60),
  ('demo.star@cloudpulse.test', -19, 6, 45),
  ('demo.star@cloudpulse.test', -17, 5, 75),
  ('demo.star@cloudpulse.test', -15, 6, 60),
  ('demo.star@cloudpulse.test', -13, 5, 60),
  ('demo.star@cloudpulse.test', -12, 6, 60),
  ('demo.star@cloudpulse.test', -10, 5, 45),
  ('demo.star@cloudpulse.test', -8, 7, 75),
  ('demo.star@cloudpulse.test', -7, 7, 60),
  ('demo.star@cloudpulse.test', -6, 8, 90),
  ('demo.star@cloudpulse.test', -5, 7, 75),
  ('demo.star@cloudpulse.test', -4, 8, 90),
  ('demo.star@cloudpulse.test', -3, 7, 60),
  ('demo.star@cloudpulse.test', -2, 8, 90),
  ('demo.star@cloudpulse.test', -1, 8, 75),
  ('demo.star@cloudpulse.test', 0, 9, 90),
  ('demo.injury@cloudpulse.test', -27, 6, 75),
  ('demo.injury@cloudpulse.test', -25, 5, 60),
  ('demo.injury@cloudpulse.test', -24, 7, 90),
  ('demo.injury@cloudpulse.test', -22, 6, 60),
  ('demo.injury@cloudpulse.test', -20, 5, 75),
  ('demo.injury@cloudpulse.test', -18, 6, 90),
  ('demo.injury@cloudpulse.test', -17, 5, 60),
  ('demo.injury@cloudpulse.test', -15, 7, 75),
  ('demo.injury@cloudpulse.test', -13, 6, 60),
  ('demo.injury@cloudpulse.test', -11, 5, 90),
  ('demo.injury@cloudpulse.test', -10, 6, 75),
  ('demo.injury@cloudpulse.test', -8, 7, 60),
  ('demo.injury@cloudpulse.test', -6, 6, 90),
  ('demo.injury@cloudpulse.test', -5, 5, 60),
  ('demo.injury@cloudpulse.test', -3, 7, 75),
  ('demo.injury@cloudpulse.test', -1, 6, 60),
  ('demo.ideal@cloudpulse.test', -27, 7, 75),
  ('demo.ideal@cloudpulse.test', -26, 4, 45),
  ('demo.ideal@cloudpulse.test', -24, 6, 60),
  ('demo.ideal@cloudpulse.test', -23, 8, 60),
  ('demo.ideal@cloudpulse.test', -21, 5, 45),
  ('demo.ideal@cloudpulse.test', -20, 7, 75),
  ('demo.ideal@cloudpulse.test', -19, 4, 45),
  ('demo.ideal@cloudpulse.test', -17, 6, 60),
  ('demo.ideal@cloudpulse.test', -16, 8, 60),
  ('demo.ideal@cloudpulse.test', -14, 5, 45),
  ('demo.ideal@cloudpulse.test', -13, 7, 75),
  ('demo.ideal@cloudpulse.test', -12, 4, 45),
  ('demo.ideal@cloudpulse.test', -10, 6, 60),
  ('demo.ideal@cloudpulse.test', -9, 8, 60),
  ('demo.ideal@cloudpulse.test', -7, 5, 45),
  ('demo.ideal@cloudpulse.test', -6, 7, 75),
  ('demo.ideal@cloudpulse.test', -5, 4, 45),
  ('demo.ideal@cloudpulse.test', -3, 6, 60),
  ('demo.ideal@cloudpulse.test', -2, 8, 60),
  ('demo.ideal@cloudpulse.test', 0, 5, 45),
  ('demo.rookie@cloudpulse.test', -2, 6, 60),
  ('demo.rookie@cloudpulse.test', 0, 5, 45)
  ) AS s(email, off, rpe, mins)
  JOIN _demo_ids d ON d.email = s.email
 ORDER BY s.off;

-- ----------------------------------------------------------------------------
-- Чек-ины (email, день, сон, стресс, усталость, мышцы — 1-7, выше = лучше;
-- боль, зона боли). Вставляются по порядку дат.
-- ----------------------------------------------------------------------------
INSERT INTO checkins (user_id, date, sleep_quality, stress, fatigue, soreness, pain_flag, pain_zone)
SELECT d.id, CURRENT_DATE + c.off, c.sleep, c.stress, c.fatigue, c.soreness, c.pain, c.pain_zone
  FROM (VALUES
  ('demo.star@cloudpulse.test', -14, 6, 5, 5, 5, false, NULL),
  ('demo.star@cloudpulse.test', -13, 6, 6, 5, 5, false, NULL),
  ('demo.star@cloudpulse.test', -12, 5, 5, 5, 5, false, NULL),
  ('demo.star@cloudpulse.test', -11, 6, 5, 6, 6, false, NULL),
  ('demo.star@cloudpulse.test', -10, 6, 5, 5, 5, false, NULL),
  ('demo.star@cloudpulse.test', -9, 5, 5, 5, 5, false, NULL),
  ('demo.star@cloudpulse.test', -8, 5, 4, 4, 4, false, NULL),
  ('demo.star@cloudpulse.test', -7, 5, 4, 4, 4, false, NULL),
  ('demo.star@cloudpulse.test', -6, 4, 4, 4, 4, false, NULL),
  ('demo.star@cloudpulse.test', -5, 4, 3, 4, 4, false, NULL),
  ('demo.star@cloudpulse.test', -4, 4, 3, 4, 3, false, NULL),
  ('demo.star@cloudpulse.test', -3, 3, 3, 4, 3, false, NULL),
  ('demo.star@cloudpulse.test', -2, 3, 2, 4, 3, false, NULL),
  ('demo.star@cloudpulse.test', -1, 3, 2, 5, 3, false, NULL),
  ('demo.star@cloudpulse.test', 0, 2, 2, 6, 3, false, NULL),
  ('demo.injury@cloudpulse.test', -13, 6, 6, 5, 5, false, NULL),
  ('demo.injury@cloudpulse.test', -11, 6, 6, 5, 5, false, NULL),
  ('demo.injury@cloudpulse.test', -10, 7, 6, 6, 5, false, NULL),
  ('demo.injury@cloudpulse.test', -8, 6, 6, 5, 5, false, NULL),
  ('demo.injury@cloudpulse.test', -6, 6, 5, 5, 5, false, NULL),
  ('demo.injury@cloudpulse.test', -5, 7, 6, 5, 5, false, NULL),
  ('demo.injury@cloudpulse.test', -3, 6, 6, 5, 4, false, NULL),
  ('demo.injury@cloudpulse.test', -1, 6, 6, 5, 4, false, NULL),
  ('demo.injury@cloudpulse.test', 0, 7, 6, 5, 3, true, 'колено'),
  ('demo.ideal@cloudpulse.test', -14, 6, 6, 6, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -13, 7, 6, 5, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -12, 6, 6, 6, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -11, 6, 5, 6, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -10, 7, 6, 6, 5, false, NULL),
  ('demo.ideal@cloudpulse.test', -9, 6, 6, 5, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -8, 6, 6, 6, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -7, 7, 6, 6, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -6, 6, 6, 5, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -5, 6, 5, 6, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -4, 7, 6, 6, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -3, 6, 6, 6, 5, false, NULL),
  ('demo.ideal@cloudpulse.test', -2, 6, 6, 5, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', -1, 7, 6, 6, 6, false, NULL),
  ('demo.ideal@cloudpulse.test', 0, 6, 6, 6, 6, false, NULL),
  ('demo.rookie@cloudpulse.test', -2, 6, 5, 5, 6, false, NULL),
  ('demo.rookie@cloudpulse.test', -1, 5, 5, 4, 5, false, NULL),
  ('demo.rookie@cloudpulse.test', 0, 6, 6, 5, 5, false, NULL)
  ) AS c(email, off, sleep, stress, fatigue, soreness, pain, pain_zone)
  JOIN _demo_ids d ON d.email = c.email
 ORDER BY c.off;

-- Финальный пересчёт по порядку дат (на всякий случай — триггеры уже посчитали).
SELECT recompute_checkin_readiness(c.user_id, c.date)
  FROM checkins c WHERE c.user_id IN (SELECT id FROM _demo_ids)
 ORDER BY c.date;

-- ----------------------------------------------------------------------------
-- Итог на сегодня — должно совпасть с /coach.
-- ----------------------------------------------------------------------------
SELECT d.team_name, c.readiness_score, c.zone, c.acwr,
       c.is_pain_blocked, c.is_match_day_blocked,
       jsonb_array_length(c.safety_violations) AS safety_blocks
  FROM _demo_ids d
  JOIN checkins c ON c.user_id = d.id AND c.date = CURRENT_DATE
 ORDER BY c.readiness_score;

COMMIT;
