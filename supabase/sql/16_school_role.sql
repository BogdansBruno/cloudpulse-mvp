-- ============================================================================
-- Lotus — роль «Школа» (медсестра / школьный администратор): светофор безопасности
-- ============================================================================
-- Четвёртый участник экосистемы: Спортсмен ↔ Тренер ↔ Родитель ↔ Школа.
-- Школа устроена так же, как родитель: данные открывает ТОЛЬКО сам спортсмен,
-- двумя отдельными переключателями (по умолчанию ВЫКЛ, время каждого изменения
-- записывается), а школа читает их не из таблиц, а через функции базы.
--
--   consent_safety   — школа видит «светофор безопасности» на сегодня:
--                      был ли чек-ин, цвет дня (green/yellow/red), есть ли
--                      ограничение нагрузки (матч / боль), и отметка «сообщил о боли».
--                      Никогда: баллы, ответы о самочувствии, ЗОНА боли, ACWR,
--                      тренировки, названия предметов.
--   consent_calendar — даты контрольных попадают в общую школьную картину, но
--                      только суммой «N учеников в этот день», и только если
--                      таких учеников не меньше трёх (иначе строка не отдаётся).
--
-- Как школа попадает к спортсмену: у аккаунта с ролью school_admin есть одна
-- школа с кодом приглашения (как у команды тренера, 08_team_invites.sql).
-- Спортсмен вводит код в «Прогресс → Школа», выбирает подпись (например, имя),
-- и по умолчанию школа не видит ничего, пока он не включит переключатели.
-- Выйти из школы — один тап (удаление связи).
--
-- Что НЕ даёт эта роль: у школы нет ни одной политики RLS на checkins / profiles /
-- sessions_log. Даже в обход интерфейса другие данные получить нельзя.
--
-- Перед запуском:
--   • Выполнены 01 … 15 (нужны user_role со значением 'school_admin',
--     gen_invite_code() из 08 и demo_state из 09).
--   • Демо: Authentication → Users → Add user → demo.school@cloudpulse.test
--     (пароль — тот же DEMO_PASSWORD, «Auto Confirm User»). Без него демо-часть
--     просто пропускается.
--   • Настоящая школьная медсестра: создаётся вручную; после регистрации
--     выполнить  UPDATE profiles SET role = 'school_admin' WHERE id = '<uuid>';
--
-- Скрипт можно запускать повторно.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Таблицы. Клиент не получает на них прямого доступа, кроме строк самого
--    спортсмена в school_members (смотреть, менять два флага, выйти).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  invite_code   TEXT NOT NULL UNIQUE DEFAULT gen_invite_code(),
  invite_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- одна школа на аккаунт
CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_one_per_owner ON schools (owner_id);

CREATE TABLE IF NOT EXISTS school_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  athlete_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_label       TEXT NOT NULL CHECK (char_length(btrim(athlete_label)) BETWEEN 1 AND 40),
  consent_safety      BOOLEAN NOT NULL DEFAULT FALSE,
  consent_calendar    BOOLEAN NOT NULL DEFAULT FALSE,
  consent_changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_school_members_athlete ON school_members (athlete_id);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_members ENABLE ROW LEVEL SECURITY;

-- schools: политик нет — всё идёт через функции ниже.
DROP POLICY IF EXISTS "school_members_athlete_select" ON school_members;
DROP POLICY IF EXISTS "school_members_athlete_update" ON school_members;
DROP POLICY IF EXISTS "school_members_athlete_leave" ON school_members;

CREATE POLICY "school_members_athlete_select" ON school_members
  FOR SELECT USING (athlete_id = (SELECT auth.uid()));

CREATE POLICY "school_members_athlete_update" ON school_members
  FOR UPDATE USING (athlete_id = (SELECT auth.uid()))
  WITH CHECK (athlete_id = (SELECT auth.uid()));

CREATE POLICY "school_members_athlete_leave" ON school_members
  FOR DELETE USING (athlete_id = (SELECT auth.uid()));

-- Права на уровне колонок: спортсмен меняет ТОЛЬКО два флага согласия.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON schools, school_members FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON schools, school_members FROM authenticated';
    EXECUTE 'GRANT SELECT, DELETE ON school_members TO authenticated';
    EXECUTE 'GRANT UPDATE (consent_safety, consent_calendar) ON school_members TO authenticated';
  END IF;
END $$;

-- Штамп времени согласия (подотчётность, как у родителя).
CREATE OR REPLACE FUNCTION school_members_consent_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.consent_safety IS DISTINCT FROM OLD.consent_safety
     OR NEW.consent_calendar IS DISTINCT FROM OLD.consent_calendar THEN
    NEW.consent_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_members_stamp ON school_members;
CREATE TRIGGER trg_school_members_stamp
  BEFORE UPDATE ON school_members
  FOR EACH ROW EXECUTE FUNCTION school_members_consent_stamp();

-- ----------------------------------------------------------------------------
-- 2. Школа: создать, посмотреть, сменить код.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS create_school(TEXT);
CREATE FUNCTION create_school(p_name TEXT)
RETURNS TABLE (school_id UUID, school_name TEXT, invite_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_uid  UUID := auth.uid();
  v_name TEXT := NULLIF(btrim(p_name), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_uid AND p.role = 'school_admin') THEN
    RAISE EXCEPTION 'NOT_SCHOOL';
  END IF;
  IF v_name IS NULL OR char_length(v_name) > 60 THEN RAISE EXCEPTION 'BAD_NAME'; END IF;

  INSERT INTO schools (owner_id, name) VALUES (v_uid, v_name)
  ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name;

  RETURN QUERY SELECT s.id, s.name, s.invite_code FROM schools s WHERE s.owner_id = v_uid;
END;
$$;

DROP FUNCTION IF EXISTS my_school();
CREATE FUNCTION my_school()
RETURNS TABLE (school_id UUID, school_name TEXT, invite_code TEXT, members INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.invite_code,
         (SELECT count(*)::int FROM school_members sm WHERE sm.school_id = s.id)
    FROM schools s
   WHERE s.owner_id = auth.uid()
     AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'school_admin');
$$;

DROP FUNCTION IF EXISTS regenerate_school_invite();
CREATE FUNCTION regenerate_school_invite()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  UPDATE schools SET invite_code = gen_invite_code()
   WHERE owner_id = auth.uid()
     AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'school_admin')
  RETURNING invite_code INTO v_code;
  IF v_code IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN v_code;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Спортсмен: предпросмотр кода, вступление, мои школы.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS school_invite_preview(TEXT);
CREATE FUNCTION school_invite_preview(p_code TEXT)
RETURNS TABLE (school_name TEXT, already_member BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.name,
         EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = s.id AND sm.athlete_id = auth.uid())
    FROM schools s
   WHERE s.invite_code = upper(btrim(p_code))
     AND s.invite_active
     AND auth.uid() IS NOT NULL;
$$;

DROP FUNCTION IF EXISTS join_school(TEXT, TEXT);
CREATE FUNCTION join_school(p_code TEXT, p_label TEXT)
RETURNS TABLE (school_id UUID, school_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_uid    UUID := auth.uid();
  v_school schools%ROWTYPE;
  v_role   user_role;
  v_demo   BOOLEAN;
  v_label  TEXT := NULLIF(btrim(p_label), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_school FROM schools s WHERE s.invite_code = upper(btrim(p_code)) AND s.invite_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_CODE'; END IF;

  IF v_label IS NULL OR char_length(v_label) > 40 THEN RAISE EXCEPTION 'BAD_LABEL'; END IF;

  INSERT INTO profiles (id, role, training_schedule, injury_history, exam_dates, match_dates)
  VALUES (v_uid, 'athlete', '[]', '[]', '{}', '{}')
  ON CONFLICT (id) DO NOTHING;

  SELECT p.role, p.is_demo INTO v_role, v_demo FROM profiles p WHERE p.id = v_uid;
  IF v_role <> 'athlete' THEN RAISE EXCEPTION 'NOT_ATHLETE'; END IF;

  -- демо и настоящие данные никогда не смешиваются
  IF v_demo IS DISTINCT FROM (SELECT p.is_demo FROM profiles p WHERE p.id = v_school.owner_id) THEN
    RAISE EXCEPTION 'DEMO_MISMATCH';
  END IF;

  -- согласия по умолчанию ВЫКЛ; повторный вход по коду их не включает
  INSERT INTO school_members (school_id, athlete_id, athlete_label)
  VALUES (v_school.id, v_uid, v_label)
  ON CONFLICT (school_id, athlete_id) DO UPDATE SET athlete_label = EXCLUDED.athlete_label;

  RETURN QUERY SELECT v_school.id, v_school.name;
END;
$$;

DROP FUNCTION IF EXISTS my_schools();
CREATE FUNCTION my_schools()
RETURNS TABLE (
  member_id          UUID,
  school_name        TEXT,
  athlete_label      TEXT,
  consent_safety     BOOLEAN,
  consent_calendar   BOOLEAN,
  consent_changed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.id, s.name, sm.athlete_label, sm.consent_safety, sm.consent_calendar, sm.consent_changed_at
    FROM school_members sm
    JOIN schools s ON s.id = sm.school_id
   WHERE sm.athlete_id = auth.uid()
   ORDER BY sm.created_at;
$$;

-- ----------------------------------------------------------------------------
-- 4. Окно школы. Светофор — только при согласии спортсмена.
--    Порядок: боль → красный → ограничение → жёлтый → нет чек-ина → зелёный.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS school_overview();
CREATE FUNCTION school_overview()
RETURNS TABLE (
  athlete_label  TEXT,
  consent        BOOLEAN,
  checked_in     BOOLEAN,
  zone           TEXT,
  restricted     BOOLEAN,
  pain           BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.athlete_label,
         sm.consent_safety,
         CASE WHEN sm.consent_safety THEN c.date IS NOT NULL END,
         CASE WHEN sm.consent_safety THEN c.zone::text END,
         CASE WHEN sm.consent_safety THEN COALESCE(c.is_pain_blocked OR c.is_match_day_blocked, FALSE) END,
         CASE WHEN sm.consent_safety THEN COALESCE(c.is_pain_blocked, FALSE) END
    FROM school_members sm
    JOIN schools s ON s.id = sm.school_id AND s.owner_id = auth.uid()
    LEFT JOIN checkins c ON c.user_id = sm.athlete_id AND c.date = CURRENT_DATE
   WHERE EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'school_admin')
   ORDER BY
     (NOT sm.consent_safety),
     COALESCE(c.is_pain_blocked, FALSE) DESC,
     (c.zone::text = 'red') DESC NULLS LAST,
     COALESCE(c.is_pain_blocked OR c.is_match_day_blocked, FALSE) DESC,
     (c.zone::text = 'yellow') DESC NULLS LAST,
     (c.date IS NULL) DESC,
     sm.athlete_label;
$$;

-- Контрольные: только сумма по дню и только если таких учеников не меньше трёх.
DROP FUNCTION IF EXISTS school_exam_load();
CREATE FUNCTION school_exam_load()
RETURNS TABLE (day DATE, athletes INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH m AS (
    SELECT sm.athlete_id
      FROM school_members sm
      JOIN schools s ON s.id = sm.school_id AND s.owner_id = auth.uid()
     WHERE sm.consent_calendar
       AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'school_admin')
  ),
  e AS (
    SELECT DISTINCT p.id AS athlete_id, x.v::date AS d
      FROM profiles p
      JOIN m ON m.athlete_id = p.id
      CROSS JOIN LATERAL unnest(p.exam_dates::text[]) AS x(v)
     WHERE x.v ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       AND x.v::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
  )
  SELECT e.d, count(*)::int
    FROM e
   GROUP BY e.d
  HAVING count(*) >= 3 AND (SELECT count(*) FROM m) >= 3
   ORDER BY e.d;
$$;

-- ----------------------------------------------------------------------------
-- 5. Права на функции: только вошедший пользователь.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION create_school(TEXT), my_school(), regenerate_school_invite(),
  school_invite_preview(TEXT), join_school(TEXT, TEXT), my_schools(), school_overview(), school_exam_load()
  FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION create_school(TEXT), my_school(), regenerate_school_invite(),
      school_invite_preview(TEXT), join_school(TEXT, TEXT), my_schools(), school_overview(), school_exam_load() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION create_school(TEXT), my_school(), regenerate_school_invite(),
      school_invite_preview(TEXT), join_school(TEXT, TEXT), my_schools(), school_overview(), school_exam_load() TO authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Демо: «Демо · Школа» + четыре демо-спортсмена с ВЫКЛЮЧЕННЫМ согласием.
--    На показе спортсмен включает переключатель сам — это часть истории про GDPR.
--    Пересоздаётся при каждом сбросе песочницы (demo_state обновляется в конце seed_demo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION demo_school_seed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_user UUID;
  v_school      UUID;
BEGIN
  SELECT id INTO v_school_user FROM auth.users WHERE email = 'demo.school@cloudpulse.test';
  IF v_school_user IS NULL THEN RETURN; END IF;

  INSERT INTO profiles (id, role, training_schedule, injury_history, exam_dates, match_dates, is_demo)
  VALUES (v_school_user, 'school_admin', '[]', '[]', '{}', '{}', TRUE)
  ON CONFLICT (id) DO UPDATE SET role = 'school_admin', is_demo = TRUE;

  INSERT INTO schools (owner_id, name) VALUES (v_school_user, 'Demo skola')
  ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_school;
  IF v_school IS NULL THEN
    SELECT id INTO v_school FROM schools WHERE owner_id = v_school_user;
  END IF;

  INSERT INTO school_members (school_id, athlete_id, athlete_label, consent_safety, consent_calendar)
  SELECT v_school, u.id, a.label, FALSE, FALSE
    FROM (VALUES ('demo.injury@cloudpulse.test', 'Макс'),
                 ('demo.star@cloudpulse.test',   'Зара'),
                 ('demo.ideal@cloudpulse.test',  'Лана'),
                 ('demo.rookie@cloudpulse.test', 'Артём')) AS a(email, label)
    JOIN auth.users u ON u.email = a.email
    JOIN profiles p ON p.id = u.id
  ON CONFLICT (school_id, athlete_id) DO UPDATE
    SET athlete_label = EXCLUDED.athlete_label, consent_safety = FALSE, consent_calendar = FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION demo_school_seed() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION demo_school_seed() FROM anon, authenticated';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION demo_school_reset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM demo_school_seed();
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION demo_school_reset() FROM PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_demo_school ON demo_state';
    EXECUTE 'CREATE TRIGGER trg_demo_school
               AFTER UPDATE ON demo_state
               FOR EACH ROW EXECUTE FUNCTION demo_school_reset()';
  END IF;
END $$;

SELECT demo_school_seed();

COMMIT;

-- Проверка: должно быть 8 функций.
SELECT proname
  FROM pg_proc
 WHERE proname IN ('create_school', 'my_school', 'regenerate_school_invite', 'school_invite_preview',
                   'join_school', 'my_schools', 'school_overview', 'school_exam_load')
 ORDER BY proname;
