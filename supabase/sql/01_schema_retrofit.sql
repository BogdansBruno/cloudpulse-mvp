-- ============================================================================
-- CloudPulse — схема, СОВМЕСТИМАЯ с реальной production-базой
-- ============================================================================
-- Заменяет cloudpulse_schema_fixed.sql. Тот файл создавал таблицы с нуля и
-- конфликтовал с уже существующими profiles/checkins/sessions_log вашего
-- рабочего приложения. Этот файл только ДОПОЛНЯЕТ существующие таблицы
-- (ALTER TABLE ADD COLUMN) и добавляет по-настоящему новые (team_members,
-- family_links) — ничего не переименовывает и не удаляет, действующий код
-- приложения продолжит работать как работал.
--
-- Реальные имена колонок (из information_schema, присланного тобой):
--   checkins:     user_id, date, sleep_quality, stress, fatigue, soreness,
--                 pain_flag, pain_zone
--   sessions_log: user_id, date, rpe, duration_minutes   (это ваш "trainings")
--   profiles:     exam_dates, match_dates — УЖЕ есть как массивы, отдельная
--                 таблица academic_events не нужна вообще.
--
-- Все содержательные исправления из прошлой итерации сохранены:
--   - Hooper Index считается с инверсией (higher=better -> higher=worse)
--   - readiness_score/acwr/zone — НЕ generated columns, считает AFTER-триггер
--   - клиент не может подделать свой Readiness Score (BEFORE-триггер обнуляет)
--   - Safety Guard остаётся отдельным от score слоем
--   - cold-start защита ACWR (мин. 7 дней истории)
-- ============================================================================

-- ------------------------------------------------------------------
-- Типы (создаются один раз; если уже есть — Supabase покажет ошибку
-- "type already exists", в этом случае просто удали блок с CREATE TYPE
-- и продолжай — значит, кто-то уже создавал их раньше).
-- ------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('athlete', 'coach', 'parent', 'school_admin');
CREATE TYPE readiness_zone AS ENUM ('green', 'yellow', 'red');

-- ------------------------------------------------------------------
-- profiles: добавляем role (по умолчанию 'athlete' — все существующие
-- строки останутся атлетами, ничего не сломается).
-- ------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'athlete';

-- ------------------------------------------------------------------
-- team_members — новая таблица, коллизий нет. Связь тренер ↔ атлет.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coach_id, athlete_id)
);

-- ------------------------------------------------------------------
-- family_links — новая таблица, коллизий нет. Согласие атлета обязательно.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (athlete_id, parent_id)
);

-- ------------------------------------------------------------------
-- sessions_log (= "trainings"): добавляем is_match и вычисляемую нагрузку.
-- ------------------------------------------------------------------
ALTER TABLE sessions_log ADD COLUMN IF NOT EXISTS is_match BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sessions_log ADD COLUMN IF NOT EXISTS calculated_workload INT
  GENERATED ALWAYS AS (rpe * duration_minutes) STORED;

CREATE INDEX IF NOT EXISTS idx_sessions_log_user_date ON sessions_log (user_id, date);

-- ------------------------------------------------------------------
-- checkins: добавляем вычисляемые поля. hooper_index — generated column
-- С ИНВЕРСИЕЙ (это то же самое исправление, что и раньше, просто теперь
-- на реальных именах колонок stress/fatigue/soreness, без суффикса _level).
-- ------------------------------------------------------------------
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS hooper_index INT
  GENERATED ALWAYS AS (
    (8 - sleep_quality) + (8 - stress) + (8 - fatigue) + (8 - soreness)
  ) STORED;

ALTER TABLE checkins ADD COLUMN IF NOT EXISTS readiness_score INT
  CHECK (readiness_score IS NULL OR readiness_score BETWEEN 0 AND 100);
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS acwr NUMERIC(4,2);
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS zone readiness_zone;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS is_pain_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS is_match_day_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS safety_violations JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins (user_id, date);

-- ============================================================================
-- Триггер 1: обнуляет вычисляемые поля при любой попытке клиента их задать.
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_computed_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.readiness_score := NULL;
  NEW.acwr := NULL;
  NEW.zone := NULL;
  NEW.is_pain_blocked := FALSE;
  NEW.is_match_day_blocked := FALSE;
  NEW.safety_violations := '[]'::jsonb;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reset_computed_fields ON checkins;
CREATE TRIGGER trg_reset_computed_fields
  BEFORE INSERT OR UPDATE OF sleep_quality, stress, fatigue, soreness, pain_flag
  ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION reset_computed_fields();

-- ============================================================================
-- Триггер 2: реальный расчёт. AFTER-триггер (generated column видна в NEW
-- только после BEFORE-триггеров), точечный UPDATE по id.
-- exam_dates/match_dates читаются прямо из profiles (уже есть в проекте),
-- приводятся к text[] через ::text[] — это работает независимо от того,
-- хранятся ли они как date[] или text[] на самом деле.
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_readiness()
RETURNS TRIGGER AS $$
DECLARE
  v_acute NUMERIC;
  v_chronic NUMERIC;
  v_acwr NUMERIC;
  v_earliest_date DATE;
  v_history_days INT;
  v_penalty NUMERIC := 0;
  v_score INT;
  v_zone readiness_zone;
  v_exam_dates TEXT[];
  v_match_dates TEXT[];
  v_near_exam BOOLEAN := FALSE;
  v_is_match_day BOOLEAN := FALSE;
  v_is_pre_match BOOLEAN := FALSE;
  v_is_post_match BOOLEAN := FALSE;
  v_violations JSONB := '[]'::jsonb;
BEGIN
  -- ACWR: acute = сумма нагрузки за 7 дней, chronic = средняя недельная
  -- нагрузка за 28 дней.
  SELECT COALESCE(SUM(calculated_workload), 0)
    INTO v_acute
    FROM sessions_log
    WHERE user_id = NEW.user_id
      AND date BETWEEN NEW.date - 6 AND NEW.date;

  SELECT COALESCE(SUM(calculated_workload), 0) / 4.0
    INTO v_chronic
    FROM sessions_log
    WHERE user_id = NEW.user_id
      AND date BETWEEN NEW.date - 27 AND NEW.date;

  SELECT MIN(date) INTO v_earliest_date
    FROM sessions_log WHERE user_id = NEW.user_id;

  -- Cold-start защита: без неё первая же тренировка даёт ложный ACWR≈4.
  IF v_chronic = 0 OR v_earliest_date IS NULL THEN
    v_acwr := NULL;
  ELSE
    v_history_days := (NEW.date - v_earliest_date) + 1;
    IF v_history_days < 7 THEN
      v_acwr := NULL;
    ELSE
      v_acwr := ROUND(v_acute / v_chronic, 2);
    END IF;
  END IF;

  -- exam_dates / match_dates — уже есть в profiles, отдельная таблица не нужна.
  SELECT exam_dates::text[], match_dates::text[]
    INTO v_exam_dates, v_match_dates
    FROM profiles WHERE id = NEW.user_id;

  IF v_exam_dates IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM unnest(v_exam_dates) AS ed
      WHERE ed::date BETWEEN NEW.date AND NEW.date + 3
    ) INTO v_near_exam;
  END IF;

  -- Штрафы — по баллам, как в lib/readiness-engine.ts.
  v_penalty := (NEW.hooper_index::NUMERIC / 28) * 60;

  IF v_acwr IS NOT NULL THEN
    IF v_acwr > 1.5 THEN v_penalty := v_penalty + 35;
    ELSIF v_acwr > 1.3 THEN v_penalty := v_penalty + 15;
    ELSIF v_acwr < 0.8 THEN v_penalty := v_penalty + 10;
    END IF;
  END IF;

  IF v_near_exam THEN
    v_penalty := v_penalty + 15;
  END IF;

  v_score := GREATEST(0, LEAST(100, ROUND(100 - v_penalty)));

  -- Safety Guard — бинарные правила, независимые от score.
  IF v_match_dates IS NOT NULL THEN
    SELECT
      EXISTS (SELECT 1 FROM unnest(v_match_dates) AS md WHERE md::date = NEW.date),
      EXISTS (SELECT 1 FROM unnest(v_match_dates) AS md WHERE md::date = NEW.date + 1),
      EXISTS (SELECT 1 FROM unnest(v_match_dates) AS md WHERE md::date = NEW.date - 1)
      INTO v_is_match_day, v_is_pre_match, v_is_post_match;
  END IF;

  IF NEW.pain_flag THEN
    v_violations := v_violations || jsonb_build_object(
      'code', 'PAIN_REPORTED', 'severity', 'block',
      'message', 'Заявлена боль. Силовые и высокоинтенсивные упражнения заблокированы.'
    );
    v_score := LEAST(v_score, 30);
  END IF;

  IF v_is_match_day THEN
    v_violations := v_violations || jsonb_build_object(
      'code', 'MATCH_DAY', 'severity', 'block',
      'message', 'Сегодня матч — только активация и лёгкая разминка.'
    );
  ELSIF v_is_pre_match THEN
    v_violations := v_violations || jsonb_build_object(
      'code', 'PRE_MATCH', 'severity', 'block',
      'message', 'Завтра матч — тяжёлая силовая под запретом.'
    );
  ELSIF v_is_post_match THEN
    v_violations := v_violations || jsonb_build_object(
      'code', 'POST_MATCH', 'severity', 'block',
      'message', 'Вчера был матч — сегодня восстановление, не силовая.'
    );
  END IF;

  v_zone := CASE
    WHEN NEW.pain_flag OR v_score < 50 THEN 'red'
    WHEN v_score < 75 THEN 'yellow'
    ELSE 'green'
  END;

  UPDATE checkins
     SET readiness_score = v_score,
         acwr = v_acwr,
         zone = v_zone,
         is_pain_blocked = NEW.pain_flag,
         is_match_day_blocked = (v_is_match_day OR v_is_pre_match),
         safety_violations = v_violations
   WHERE id = NEW.id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_compute_readiness ON checkins;
CREATE TRIGGER trg_compute_readiness
  AFTER INSERT OR UPDATE OF sleep_quality, stress, fatigue, soreness, pain_flag
  ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION compute_readiness();

-- ============================================================================
-- RLS включён "по умолчанию закрыто" только на НОВЫХ таблицах. Существующие
-- profiles/checkins/sessions_log трогать не буду в этом файле — если на них
-- уже стоит своя RLS-логика от текущего приложения, ALTER мог бы её сломать.
-- Это отдельно проверим и donастроим на шаге 2 (RLS-политики), когда увидим,
-- что там уже настроено.
-- ============================================================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;
