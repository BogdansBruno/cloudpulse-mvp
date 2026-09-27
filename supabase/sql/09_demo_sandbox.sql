-- ============================================================================
-- CloudPulse — демо-песочница для жюри (/demo)
-- ============================================================================
-- Что делает скрипт:
--
-- 1. seed_demo() — вся логика 04_seed_demo_data.sql и 07_seed_parent_demo.sql
--    в одной функции. Сбрасывает ТОЛЬКО демо-аккаунты (@cloudpulse.test):
--    чек-ины, тренировки, профили, команды демо-тренера, связь демо-родителя
--    (согласие снова ВЫКЛ). Настоящих тестеров не трогает.
--
-- 2. Автосброс раз в день: reset_demo_if_stale() вызывается при каждом входе
--    через /demo. Если сегодня сброса ещё не было — данные пересоздаются
--    относительно СЕГОДНЯ. Больше не нужно запускать 04 утром в день
--    презентации — окна ACWR всегда свежие.
--
-- 3. reset_demo() — кнопка «Сбросить демо» (только для демо-аккаунтов).
--
-- 4. Демо-тренер — отдельный аккаунт demo.coach@cloudpulse.test, а не твой
--    личный. is_demo теперь = «email на @cloudpulse.test», твой аккаунт
--    перестаёт быть демо (он админ — его пароль жюри получать не должно).
--
-- 5. join_team() больше не пускает демо-аккаунт в настоящую команду и
--    настоящего человека — в демо-команду (иначе его данные увидел бы любой,
--    кто вошёл как демо-тренер).
--
-- Перед запуском: Authentication → Users → Add user →
--   demo.coach@cloudpulse.test (пароль — тот же DEMO_PASSWORD, "Auto Confirm User").
-- Скрипт можно запускать повторно.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Демо-пометка: ровно аккаунты на @cloudpulse.test.
-- ----------------------------------------------------------------------------
INSERT INTO profiles (id, role, training_schedule, injury_history, exam_dates, match_dates, is_demo)
SELECT id, 'coach', '[]', '[]', '{}', '{}', TRUE
  FROM auth.users WHERE email = 'demo.coach@cloudpulse.test'
ON CONFLICT (id) DO UPDATE SET role = 'coach', is_demo = TRUE;

UPDATE profiles p
   SET is_demo = (u.email LIKE '%@cloudpulse.test')
  FROM auth.users u
 WHERE u.id = p.id
   AND p.is_demo IS DISTINCT FROM (u.email LIKE '%@cloudpulse.test');

-- ----------------------------------------------------------------------------
-- 2. Когда был последний сброс.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demo_state (
  id INT PRIMARY KEY CHECK (id = 1),
  last_reset DATE
);
INSERT INTO demo_state (id, last_reset) VALUES (1, NULL) ON CONFLICT (id) DO NOTHING;
ALTER TABLE demo_state ENABLE ROW LEVEL SECURITY;  -- политик нет: клиенту таблица не видна
REVOKE ALL ON demo_state FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Пересоздание демо-данных.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_demo()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET client_min_messages = warning
AS $$
DECLARE
  v_coach   UUID;
  v_parent  UUID;
  v_injury  UUID;
  v_missing TEXT;
BEGIN
  -- Два входа жюри в одну секунду не должны сбрасывать данные параллельно.
  PERFORM pg_advisory_xact_lock(hashtext('cloudpulse_seed_demo'));

  SELECT id INTO v_coach FROM auth.users WHERE email = 'demo.coach@cloudpulse.test';
  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'Сначала создай demo.coach@cloudpulse.test в Authentication → Users';
  END IF;

  DROP TABLE IF EXISTS _demo_athletes;
  CREATE TEMP TABLE _demo_athletes (
    email TEXT, team_name TEXT, age INT, sport TEXT, exam_dates DATE[], match_dates DATE[]
  ) ON COMMIT DROP;

  INSERT INTO _demo_athletes VALUES
    ('demo.star@cloudpulse.test', 'Демо · Звезда в зоне риска', 17, 'basketball', ARRAY[CURRENT_DATE + 0]::date[], ARRAY[]::date[]),
    ('demo.injury@cloudpulse.test', 'Демо · Скрытая травма', 16, 'football', ARRAY[]::date[], ARRAY[CURRENT_DATE + 1]::date[]),
    ('demo.ideal@cloudpulse.test', 'Демо · Идеальная форма', 17, 'athletics', ARRAY[]::date[], ARRAY[]::date[]),
    ('demo.rookie@cloudpulse.test', 'Демо · Новичок', 15, 'swimming', ARRAY[]::date[], ARRAY[]::date[]);

  SELECT string_agg(a.email, ', ') INTO v_missing
    FROM _demo_athletes a LEFT JOIN auth.users u ON u.email = a.email
   WHERE u.id IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Сначала создай демо-аккаунты в Authentication → Users: %', v_missing;
  END IF;

  DROP TABLE IF EXISTS _demo_ids;
  CREATE TEMP TABLE _demo_ids ON COMMIT DROP AS
    SELECT u.id, a.* FROM _demo_athletes a JOIN auth.users u ON u.email = a.email;

  -- Очистка: всё, что жюри могло натворить демо-аккаунтами.
  DELETE FROM checkins     WHERE user_id IN (SELECT id FROM _demo_ids);
  DELETE FROM sessions_log WHERE user_id IN (SELECT id FROM _demo_ids);
  DELETE FROM team_members WHERE athlete_id IN (SELECT id FROM _demo_ids) OR coach_id = v_coach;
  DELETE FROM teams        WHERE coach_id = v_coach;

  -- Профили и привязка к демо-тренеру.
  INSERT INTO profiles (id, role, age, sport, exam_dates, match_dates, exam_subjects, training_schedule, injury_history, is_demo)
  SELECT id, 'athlete', age, sport, exam_dates, match_dates, '{}', '[]', '[]', TRUE FROM _demo_ids
  ON CONFLICT (id) DO UPDATE
    SET role = 'athlete', is_demo = TRUE, age = EXCLUDED.age, sport = EXCLUDED.sport,
        exam_dates = EXCLUDED.exam_dates, match_dates = EXCLUDED.match_dates,
        exam_subjects = '{}', training_schedule = '[]', injury_history = '[]';

  UPDATE profiles SET role = 'coach', is_demo = TRUE, exam_dates = '{}', match_dates = '{}'
   WHERE id = v_coach;

  INSERT INTO team_members (coach_id, athlete_id, team_name)
  SELECT v_coach, d.id, d.team_name FROM _demo_ids d;

  -- Тренировки (email, день относительно сегодня, RPE 1-10, минуты).
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

  -- Чек-ины (email, день, сон, стресс, усталость, мышцы — 1-7; боль, зона).
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

  -- Финальный пересчёт по порядку дат (триггеры уже посчитали — на всякий случай).
  PERFORM recompute_checkin_readiness(c.user_id, c.date)
     FROM (SELECT user_id, date FROM checkins
            WHERE user_id IN (SELECT id FROM _demo_ids) ORDER BY date) c;

  -- Демо-родитель ↔ «Скрытая травма», согласие ВЫКЛ (на демо включает сам атлет).
  SELECT id INTO v_parent FROM auth.users WHERE email = 'demo.parent@cloudpulse.test';
  SELECT id INTO v_injury FROM _demo_ids WHERE email = 'demo.injury@cloudpulse.test';
  IF v_parent IS NOT NULL THEN
    INSERT INTO profiles (id, role, training_schedule, injury_history, exam_dates, match_dates, is_demo)
    VALUES (v_parent, 'parent', '[]', '[]', '{}', '{}', TRUE)
    ON CONFLICT (id) DO UPDATE SET role = 'parent', is_demo = TRUE;

    INSERT INTO family_links (athlete_id, parent_id, athlete_label, parent_label, parent_notifications_enabled)
    VALUES (v_injury, v_parent, 'Макс', 'Мама', FALSE)
    ON CONFLICT (athlete_id, parent_id) DO UPDATE
      SET athlete_label = EXCLUDED.athlete_label,
          parent_label = EXCLUDED.parent_label,
          parent_notifications_enabled = FALSE;
  END IF;

  UPDATE demo_state SET last_reset = CURRENT_DATE WHERE id = 1;
END;
$$;

-- Кнопка «Сбросить демо». Только демо-аккаунт может её нажать.
CREATE OR REPLACE FUNCTION reset_demo()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_demo) THEN
    RAISE EXCEPTION 'NOT_DEMO';
  END IF;
  PERFORM seed_demo();
END;
$$;

-- При каждом входе через /demo: сбросить, если сегодня ещё не сбрасывали.
CREATE OR REPLACE FUNCTION reset_demo_if_stale()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_demo) THEN
    RAISE EXCEPTION 'NOT_DEMO';
  END IF;
  IF (SELECT last_reset FROM demo_state WHERE id = 1) IS NOT DISTINCT FROM CURRENT_DATE THEN
    RETURN FALSE;
  END IF;
  PERFORM seed_demo();
  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION seed_demo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION reset_demo() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION reset_demo_if_stale() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reset_demo() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_demo_if_stale() TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. join_team: демо и настоящие команды не смешиваются.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION join_team(p_code TEXT, p_label TEXT)
RETURNS TABLE (team_id UUID, team_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_uid   UUID := auth.uid();
  v_team  teams%ROWTYPE;
  v_role  user_role;
  v_demo  BOOLEAN;
  v_label TEXT := NULLIF(btrim(p_label), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_team
    FROM teams t
   WHERE t.invite_code = upper(btrim(p_code)) AND t.invite_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  IF v_team.coach_id = v_uid THEN
    RAISE EXCEPTION 'OWN_TEAM';
  END IF;

  IF v_label IS NULL OR char_length(v_label) > 40 THEN
    RAISE EXCEPTION 'BAD_LABEL';
  END IF;

  INSERT INTO profiles (id, role, training_schedule, injury_history, exam_dates, match_dates)
  VALUES (v_uid, 'athlete', '[]', '[]', '{}', '{}')
  ON CONFLICT (id) DO NOTHING;

  SELECT p.role, p.is_demo INTO v_role, v_demo FROM profiles p WHERE p.id = v_uid;
  IF v_role <> 'athlete' THEN
    RAISE EXCEPTION 'NOT_ATHLETE';
  END IF;

  IF v_demo THEN
    RAISE EXCEPTION 'DEMO_ACCOUNT';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_team.coach_id AND p.is_demo) THEN
    RAISE EXCEPTION 'DEMO_TEAM';
  END IF;

  INSERT INTO team_members (coach_id, athlete_id, team_name, team_id, athlete_label)
  VALUES (v_team.coach_id, v_uid, v_team.name, v_team.id, v_label)
  ON CONFLICT (coach_id, athlete_id) DO UPDATE
    SET team_id = EXCLUDED.team_id,
        team_name = EXCLUDED.team_name,
        athlete_label = EXCLUDED.athlete_label;

  RETURN QUERY SELECT v_team.id, v_team.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION join_team(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION join_team(TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Первый сброс прямо сейчас.
-- ----------------------------------------------------------------------------
SELECT seed_demo();

COMMIT;

-- Проверка 1: демо-аккаунты (ожидается 6 строк, твоего gmail среди них нет).
SELECT u.email, p.role, p.is_demo
  FROM profiles p JOIN auth.users u ON u.id = p.id
 WHERE p.is_demo
 ORDER BY p.role, u.email;
