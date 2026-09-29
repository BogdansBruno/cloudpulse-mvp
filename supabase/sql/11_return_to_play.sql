-- ============================================================================
-- CloudPulse — Return-to-Play: возвращение к нагрузке после боли (пункт 10)
-- ============================================================================
-- Правила (те же, что в lib/return-to-play.ts):
--
--   Эпизод = последний чек-ин с болью за 28 дней.
--   «Ограничен»   — после боли меньше 2 дней с чек-ином без боли.
--   «Ждёт допуска» — 2+ дня без боли; полную нагрузку подтверждает тренер.
--   «Допущен»      — тренер подтвердил (строка в rtp_clearances).
--   Новая боль — новый эпизод, счёт с нуля. День без чек-ина не считается
--   «днём без боли».
--
-- Что добавляет скрипт:
--
-- 1. rtp_followups — переспрос на день +1 и +3: «как сейчас по сравнению с днём
--    боли» и «осматривал ли врач / медсестра / физиотерапевт». Отвечает только
--    сам спортсмен, через RPC answer_rtp_followup. Ответ окончательный.
--
-- 2. rtp_clearances — допуск тренера. Только через RPC clear_return_to_play и
--    только когда база САМА насчитала 2 дня без боли — кнопку в браузере
--    нельзя «уговорить». Это не медицинский допуск, и интерфейс это пишет.
--
-- 3. Кто видит: спортсмен — своё, тренер — свою команду. Родитель — нет.
--
-- 4. Realtime для rtp_clearances: спортсмен видит допуск сразу.
--
-- 5. Демо: при сбросе песочницы у «Новичка» появляется история для показа
--    жюри — боль в плече 3 дня назад, потом 3 дня без боли, ответы на
--    переспрос. Он ждёт допуска тренера: на /coach это можно нажать вживую.
--
-- Статус НЕ хранится в базе — он каждый раз считается из чек-инов. Поэтому
-- нечего рассинхронизировать, а чек-ины не меняются. Скрипт можно запускать
-- повторно.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Таблицы
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rtp_followups (
  athlete_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pain_date      DATE NOT NULL,
  day_offset     SMALLINT NOT NULL CHECK (day_offset IN (1, 3)),
  trend          TEXT NOT NULL CHECK (trend IN ('better', 'same', 'worse')),
  saw_specialist BOOLEAN NOT NULL,
  answered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (athlete_id, pain_date, day_offset)
);

CREATE TABLE IF NOT EXISTS rtp_clearances (
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pain_date  DATE NOT NULL,
  cleared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cleared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Сколько дней без боли было в момент допуска (для истории).
  clean_days INT NOT NULL CHECK (clean_days >= 2),
  PRIMARY KEY (athlete_id, pain_date)
);

ALTER TABLE rtp_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtp_clearances ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON rtp_followups, rtp_clearances FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON rtp_followups, rtp_clearances FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON rtp_followups, rtp_clearances FROM authenticated';
    EXECUTE 'GRANT SELECT ON rtp_followups, rtp_clearances TO authenticated';
  END IF;
END $$;

DROP POLICY IF EXISTS "rtp_followups_athlete_own" ON rtp_followups;
CREATE POLICY "rtp_followups_athlete_own" ON rtp_followups
  FOR SELECT USING (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "rtp_followups_coach_team" ON rtp_followups;
CREATE POLICY "rtp_followups_coach_team" ON rtp_followups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm
             WHERE tm.athlete_id = rtp_followups.athlete_id AND tm.coach_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "rtp_clearances_athlete_own" ON rtp_clearances;
CREATE POLICY "rtp_clearances_athlete_own" ON rtp_clearances
  FOR SELECT USING (athlete_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "rtp_clearances_coach_team" ON rtp_clearances;
CREATE POLICY "rtp_clearances_coach_team" ON rtp_clearances
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm
             WHERE tm.athlete_id = rtp_clearances.athlete_id AND tm.coach_id = (SELECT auth.uid()))
  );

-- ----------------------------------------------------------------------------
-- 2. Правила эпизода (внутренние функции, клиенту недоступны)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rtp_latest_pain(p_athlete UUID)
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max(c.date)
    FROM checkins c
   WHERE c.user_id = p_athlete
     AND c.pain_flag IS TRUE
     AND c.date BETWEEN CURRENT_DATE - 28 AND CURRENT_DATE;
$$;

CREATE OR REPLACE FUNCTION rtp_clean_days(p_athlete UUID, p_pain_date DATE)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT c.date)::int
    FROM checkins c
   WHERE c.user_id = p_athlete
     AND c.date > p_pain_date
     AND c.date <= CURRENT_DATE
     AND c.pain_flag IS NOT TRUE;
$$;

REVOKE EXECUTE ON FUNCTION rtp_latest_pain(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rtp_clean_days(UUID, DATE) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION rtp_latest_pain(UUID) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION rtp_clean_days(UUID, DATE) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION rtp_latest_pain(UUID) FROM authenticated';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION rtp_clean_days(UUID, DATE) FROM authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Переспрос: отвечает спортсмен
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION answer_rtp_followup(
  p_pain_date DATE,
  p_day_offset INT,
  p_trend TEXT,
  p_saw_specialist BOOLEAN
)
RETURNS SETOF rtp_followups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_day_offset IS NULL OR p_day_offset NOT IN (1, 3)
     OR p_trend IS NULL OR p_trend NOT IN ('better', 'same', 'worse')
     OR p_saw_specialist IS NULL THEN
    RAISE EXCEPTION 'BAD_ANSWER';
  END IF;
  -- Только про текущий эпизод (последнюю боль).
  IF p_pain_date IS NULL OR p_pain_date IS DISTINCT FROM rtp_latest_pain(v_uid) THEN
    RAISE EXCEPTION 'NO_EPISODE';
  END IF;
  IF CURRENT_DATE < p_pain_date + p_day_offset THEN
    RAISE EXCEPTION 'NOT_DUE';
  END IF;
  IF EXISTS (SELECT 1 FROM rtp_clearances WHERE athlete_id = v_uid AND pain_date = p_pain_date) THEN
    RAISE EXCEPTION 'EPISODE_CLOSED';
  END IF;

  RETURN QUERY
  INSERT INTO rtp_followups (athlete_id, pain_date, day_offset, trend, saw_specialist)
  VALUES (v_uid, p_pain_date, p_day_offset::smallint, p_trend, p_saw_specialist)
  ON CONFLICT (athlete_id, pain_date, day_offset) DO NOTHING
  RETURNING *;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Допуск: подтверждает тренер этого спортсмена
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clear_return_to_play(p_athlete_id UUID, p_pain_date DATE)
RETURNS SETOF rtp_clearances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_clean INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.coach_id = v_uid AND tm.athlete_id = p_athlete_id
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  -- Экран тренера мог устареть: за это время спортсмен снова отметил боль.
  IF p_pain_date IS NULL OR p_pain_date IS DISTINCT FROM rtp_latest_pain(p_athlete_id) THEN
    RAISE EXCEPTION 'NOT_LATEST_PAIN';
  END IF;

  v_clean := rtp_clean_days(p_athlete_id, p_pain_date);
  IF v_clean < 2 THEN
    RAISE EXCEPTION 'NOT_READY';
  END IF;

  RETURN QUERY
  INSERT INTO rtp_clearances (athlete_id, pain_date, cleared_by, clean_days)
  VALUES (p_athlete_id, p_pain_date, v_uid, v_clean)
  ON CONFLICT (athlete_id, pain_date) DO NOTHING
  RETURNING *;
END;
$$;

REVOKE EXECUTE ON FUNCTION answer_rtp_followup(DATE, INT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clear_return_to_play(UUID, DATE) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION answer_rtp_followup(DATE, INT, TEXT, BOOLEAN) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION clear_return_to_play(UUID, DATE) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION answer_rtp_followup(DATE, INT, TEXT, BOOLEAN) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION clear_return_to_play(UUID, DATE) TO authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Realtime: допуск появляется у спортсмена сразу
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rtp_clearances'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE rtp_clearances';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Демо-история для жюри (срабатывает в конце seed_demo, через demo_state)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION demo_rtp_story()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rookie UUID;
  v_day    DATE;
BEGIN
  DELETE FROM rtp_clearances WHERE athlete_id IN (SELECT id FROM profiles WHERE is_demo);
  DELETE FROM rtp_followups  WHERE athlete_id IN (SELECT id FROM profiles WHERE is_demo);

  SELECT id INTO v_rookie FROM auth.users WHERE email = 'demo.rookie@cloudpulse.test';
  IF v_rookie IS NULL THEN
    RETURN NULL;
  END IF;

  -- «Новичок»: 3 дня назад боль в плече, потом 3 чек-ина без боли.
  INSERT INTO checkins (user_id, date, sleep_quality, stress, fatigue, soreness, pain_flag, pain_zone)
  SELECT v_rookie, CURRENT_DATE - 3, 5, 5, 4, 3, TRUE, 'плечо'
   WHERE NOT EXISTS (SELECT 1 FROM checkins WHERE user_id = v_rookie AND date = CURRENT_DATE - 3);

  -- Следующие дни пересчитать: в их личной норме теперь есть и этот день.
  FOR v_day IN SELECT generate_series(CURRENT_DATE - 2, CURRENT_DATE, INTERVAL '1 day')::date LOOP
    PERFORM recompute_checkin_readiness(v_rookie, v_day);
  END LOOP;

  INSERT INTO rtp_followups (athlete_id, pain_date, day_offset, trend, saw_specialist, answered_at)
  VALUES
    (v_rookie, CURRENT_DATE - 3, 1, 'better', FALSE, now() - INTERVAL '2 days'),
    (v_rookie, CURRENT_DATE - 3, 3, 'better', TRUE, now() - INTERVAL '1 hour')
  ON CONFLICT (athlete_id, pain_date, day_offset) DO NOTHING;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION demo_rtp_story() FROM PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_demo_rtp_story ON demo_state';
    EXECUTE 'CREATE TRIGGER trg_demo_rtp_story
               AFTER UPDATE ON demo_state
               FOR EACH ROW EXECUTE FUNCTION demo_rtp_story()';
  END IF;
END $$;

-- Сразу применить демо-историю (не дожидаясь завтрашнего сброса).
DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    UPDATE demo_state SET last_reset = last_reset WHERE id = 1;
  END IF;
END $$;

COMMIT;

-- Проверка: ожидается 1 строка — «Новичок», боль 3 дня назад, 3 дня без боли.
SELECT u.email,
       rtp_latest_pain(u.id)                         AS pain_date,
       rtp_clean_days(u.id, rtp_latest_pain(u.id))   AS clean_days
  FROM auth.users u
 WHERE u.email = 'demo.rookie@cloudpulse.test';
