-- ============================================================================
-- CloudPulse — Readiness-триггер v2: точная копия lib/readiness-engine.ts
-- ============================================================================
-- Заменяет расчёт из cloudpulse_schema_retrofit.sql. Что было не так в v1:
--
-- 1. Формула балла не совпадала с TS-движком. v1 штрафовал за абсолютный
--    Hooper (hooper_index / 28 * 60) — в движке такого штрафа нет, там Hooper
--    сравнивается с личной нормой за 14 дней. И в v1 не было штрафов за
--    monotony и за дни подряд без отдыха. Итог: в базе 81, в приложении 100.
-- 2. /api/checkin сначала сохраняет чек-ин, а тренировку — потом. v1
--    пересчитывался только от изменения чек-ина, поэтому сегодняшняя
--    тренировка в балл не попадала. Теперь пересчёт идёт и от sessions_log.
-- 3. Защита от подделки была неполной: UPDATE только колонки
--    readiness_score проходил мимо BEFORE-триггера. Теперь любые прямые
--    изменения вычисляемых полей откатываются.
--
-- Колонки таблиц НЕ меняются. Скрипт можно запускать повторно.
-- В конце — пересчёт всех существующих чек-инов по новой формуле.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Единая функция пересчёта одного чек-ина (user, date).
-- Каждый блок ниже соответствует функции из lib/readiness-engine.ts.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recompute_checkin_readiness(p_user UUID, p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin      checkins%ROWTYPE;
  v_acute        NUMERIC;
  v_chronic      NUMERIC;
  v_acwr         NUMERIC;
  v_earliest     DATE;
  v_mean         NUMERIC;
  v_stddev       NUMERIC;
  v_monotony     NUMERIC;
  v_baseline     NUMERIC;
  v_baseline_n   INT;
  v_streak       INT := 0;
  v_exam_dates   TEXT[];
  v_match_dates  TEXT[];
  v_near_exam    BOOLEAN := FALSE;
  v_penalty      INT := 0;
  v_points       INT;
  v_score        INT;
  v_zone         readiness_zone;
  v_violations   JSONB := '[]'::jsonb;
  v_match_block  BOOLEAN := FALSE;
  v_md           TEXT;
  v_diff         INT;
  v_pain_zone    TEXT;
BEGIN
  SELECT * INTO v_checkin FROM checkins WHERE user_id = p_user AND date = p_date;
  IF NOT FOUND THEN
    RETURN;  -- тренировка без чек-ина за этот день: пересчитывать нечего
  END IF;

  -- calculateACWR: acute = нагрузка за 7 дней, chronic = средняя недельная
  -- за 28 дней. Cold-start: null, если chronic = 0 или истории < 7 дней.
  -- Самая ранняя тренировка берётся в окне 28 дней — как в /api/checkin.
  SELECT COALESCE(SUM(rpe * duration_minutes), 0) INTO v_acute
    FROM sessions_log WHERE user_id = p_user AND date BETWEEN p_date - 6 AND p_date;
  SELECT COALESCE(SUM(rpe * duration_minutes), 0) / 4.0 INTO v_chronic
    FROM sessions_log WHERE user_id = p_user AND date BETWEEN p_date - 27 AND p_date;
  SELECT MIN(date) INTO v_earliest
    FROM sessions_log WHERE user_id = p_user AND date BETWEEN p_date - 28 AND p_date;

  IF v_chronic = 0 OR v_earliest IS NULL OR (p_date - v_earliest) + 1 < 7 THEN
    v_acwr := NULL;
  ELSE
    v_acwr := v_acute / v_chronic;  -- сравниваем НЕокруглённое, как в TS
  END IF;

  -- calculateMonotony: среднее / стандартное отклонение дневной нагрузки
  -- за 7 дней (включая дни без тренировок как 0).
  SELECT AVG(day_load), STDDEV_POP(day_load) INTO v_mean, v_stddev
  FROM (
    SELECT COALESCE(SUM(s.rpe * s.duration_minutes), 0)::NUMERIC AS day_load
    FROM generate_series((p_date - 6)::timestamp, p_date::timestamp, INTERVAL '1 day') AS d(day)
    LEFT JOIN sessions_log s ON s.user_id = p_user AND s.date = d.day::date
    GROUP BY d.day
  ) t;
  IF v_mean = 0 OR v_stddev = 0 THEN
    v_monotony := NULL;
  ELSE
    v_monotony := v_mean / v_stddev;
  END IF;

  -- calculateHooperBaseline: средний Hooper за 14 дней ДО сегодня, минимум 3 точки.
  SELECT AVG(hooper_index), COUNT(*) INTO v_baseline, v_baseline_n
    FROM checkins WHERE user_id = p_user AND date >= p_date - 14 AND date < p_date;
  IF v_baseline_n < 3 THEN
    v_baseline := NULL;
  END IF;

  -- calculateTrainingStreak: дни подряд с тренировкой, заканчивая сегодня (до 21).
  FOR i IN 0..20 LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM sessions_log WHERE user_id = p_user AND date = p_date - i
    );
    v_streak := v_streak + 1;
  END LOOP;

  SELECT exam_dates::text[], match_dates::text[] INTO v_exam_dates, v_match_dates
    FROM profiles WHERE id = p_user;

  IF v_exam_dates IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM unnest(v_exam_dates) AS ed WHERE ed::date BETWEEN p_date AND p_date + 3
    ) INTO v_near_exam;
  END IF;

  -- calculateReadiness: штрафы в баллах.
  IF v_acwr IS NOT NULL THEN
    IF v_acwr > 1.5 THEN v_penalty := v_penalty + 35;
    ELSIF v_acwr > 1.3 THEN v_penalty := v_penalty + 15;
    ELSIF v_acwr < 0.8 THEN v_penalty := v_penalty + 10;
    END IF;
  END IF;

  IF v_baseline IS NOT NULL AND v_checkin.hooper_index > v_baseline THEN
    v_points := LEAST(25, ROUND((v_checkin.hooper_index - v_baseline) * 4));
    IF v_points > 0 THEN v_penalty := v_penalty + v_points; END IF;
  END IF;

  IF v_streak > 6 THEN
    v_penalty := v_penalty + LEAST(20, (v_streak - 6) * 5);
  END IF;

  IF v_near_exam THEN v_penalty := v_penalty + 15; END IF;

  IF v_monotony IS NOT NULL AND v_monotony > 2.0 THEN v_penalty := v_penalty + 10; END IF;

  v_score := GREATEST(0, 100 - v_penalty);
  IF v_checkin.pain_flag THEN
    v_score := LEAST(v_score, 30);
  END IF;

  v_zone := CASE
    WHEN v_checkin.pain_flag OR v_score < 50 THEN 'red'
    WHEN v_score < 75 THEN 'yellow'
    ELSE 'green'
  END;

  -- detectSafetyViolations: те же коды и тексты, что в TS.
  IF v_checkin.pain_flag THEN
    v_pain_zone := NULLIF(v_checkin.pain_zone, '');
    v_violations := v_violations || jsonb_build_object(
      'code', 'PAIN_REPORTED',
      'severity', 'block',
      'message', 'Заявлена боль' || COALESCE(' (зона: ' || v_pain_zone || ')', '')
        || '. Силовые и высокоинтенсивные упражнения на сегодня заблокированы. Рекомендация: показаться врачу, школьной медсестре или физиотерапевту — не гадать самостоятельно.'
    );
  END IF;

  IF v_match_dates IS NOT NULL THEN
    FOREACH v_md IN ARRAY v_match_dates LOOP
      v_diff := v_md::date - p_date;
      IF v_diff = 0 THEN
        v_violations := v_violations || jsonb_build_object('code', 'MATCH_DAY', 'severity', 'block',
          'message', 'Сегодня день матча — только активация и лёгкая разминка, без силовой работы.');
        v_match_block := TRUE;
      ELSIF v_diff = 1 THEN
        v_violations := v_violations || jsonb_build_object('code', 'PRE_MATCH', 'severity', 'block',
          'message', 'Завтра матч — тяжёлые силовые и высокоинтенсивные интервалы под запретом, только техника и лёгкий объём.');
        v_match_block := TRUE;
      ELSIF v_diff = -1 THEN
        v_violations := v_violations || jsonb_build_object('code', 'POST_MATCH', 'severity', 'block',
          'message', 'Вчера был матч — сегодня восстановление (растяжка, лёгкое кардио), не силовая.');
        v_match_block := TRUE;
      END IF;
    END LOOP;
  END IF;

  -- Флаг для guard-триггера: это легальная запись вычисляемых полей.
  PERFORM set_config('cloudpulse.recompute', 'on', true);
  UPDATE checkins
     SET readiness_score      = v_score,
         acwr                 = ROUND(v_acwr, 2),
         zone                 = v_zone,
         is_pain_blocked      = v_checkin.pain_flag,
         is_match_day_blocked = v_match_block,
         safety_violations    = v_violations
   WHERE user_id = p_user AND date = p_date;
  PERFORM set_config('cloudpulse.recompute', 'off', true);
END;
$$;

-- Клиенты (anon / authenticated) не должны вызывать пересчёт напрямую через RPC.
REVOKE EXECUTE ON FUNCTION recompute_checkin_readiness(UUID, DATE) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION recompute_checkin_readiness(UUID, DATE) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION recompute_checkin_readiness(UUID, DATE) FROM authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Guard: клиент не может записать вычисляемые поля ни через INSERT, ни через
-- UPDATE. Пропускает только запись из recompute_checkin_readiness().
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_computed_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('cloudpulse.recompute', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.readiness_score      := NULL;
    NEW.acwr                 := NULL;
    NEW.zone                 := NULL;
    NEW.is_pain_blocked      := FALSE;
    NEW.is_match_day_blocked := FALSE;
    NEW.safety_violations    := '[]'::jsonb;
  ELSE
    NEW.readiness_score      := OLD.readiness_score;
    NEW.acwr                 := OLD.acwr;
    NEW.zone                 := OLD.zone;
    NEW.is_pain_blocked      := OLD.is_pain_blocked;
    NEW.is_match_day_blocked := OLD.is_match_day_blocked;
    NEW.safety_violations    := OLD.safety_violations;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_computed_fields ON checkins;
DROP FUNCTION IF EXISTS reset_computed_fields();
DROP TRIGGER IF EXISTS trg_guard_computed_fields ON checkins;
CREATE TRIGGER trg_guard_computed_fields
  BEFORE INSERT OR UPDATE ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION guard_computed_fields();

-- ----------------------------------------------------------------------------
-- Пересчёт при изменении чек-ина.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_readiness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recompute_checkin_readiness(NEW.user_id, NEW.date);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_readiness ON checkins;
CREATE TRIGGER trg_compute_readiness
  AFTER INSERT OR UPDATE OF date, sleep_quality, stress, fatigue, soreness, pain_flag, pain_zone
  ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION compute_readiness();

-- ----------------------------------------------------------------------------
-- Пересчёт при добавлении / изменении / удалении тренировки.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sessions_recompute_readiness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM recompute_checkin_readiness(OLD.user_id, OLD.date);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recompute_checkin_readiness(NEW.user_id, NEW.date);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_recompute_readiness ON sessions_log;
CREATE TRIGGER trg_sessions_recompute_readiness
  AFTER INSERT OR UPDATE OR DELETE ON sessions_log
  FOR EACH ROW
  EXECUTE FUNCTION sessions_recompute_readiness();

-- ----------------------------------------------------------------------------
-- Пересчитать все существующие чек-ины по новой формуле.
-- ----------------------------------------------------------------------------
SELECT recompute_checkin_readiness(user_id, date) FROM checkins;

COMMIT;
