-- ============================================================================
-- CloudPulse — приглашение в команду по QR-коду
-- ============================================================================
-- Что делает скрипт:
--
-- 1. teams — команда тренера с кодом приглашения (8 символов, без похожих
--    друг на друга I/O/0/1). Код генерирует только база: клиент не может
--    вписать свой простой код вроде "AAAA" (права на уровне колонок).
--
-- 2. Спортсмен вступает ТОЛЬКО сам, через функцию join_team(код, подпись).
--    Раньше политика "team_coach_manage_own" разрешала тренеру вставить в
--    team_members любого спортсмена, зная его id, — без согласия спортсмена.
--    Теперь тренер может только смотреть свою команду и убирать из неё.
--    Спортсмен может сам выйти из команды в любой момент (GDPR: отзыв).
--
-- 3. team_members.athlete_label — как спортсмен подписан у тренера
--    ("Макс К."). Выбирает сам спортсмен при вступлении: имя в базе
--    нигде больше не хранится (минимизация данных).
--
-- 4. profiles.is_demo — пометка демо-аккаунтов. Нужна уже сейчас:
--    04_seed_demo_data.sql искал "ровно одного тренера", и сломался бы, как
--    только появится первый настоящий тренер-тестер. Позже по этому же флагу
--    демо-данные не попадут в статистику валидации.
--
-- Скрипт можно запускать повторно.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Демо-пометка.
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- Демо-атлеты и демо-родитель — все @cloudpulse.test.
UPDATE profiles p SET is_demo = TRUE
  FROM auth.users u
 WHERE u.id = p.id AND u.email LIKE '%@cloudpulse.test';

-- Демо-тренер: если сейчас в базе ровно один тренер, это он (так его
-- находил 04_seed_demo_data.sql). Если тренеров уже несколько — пометь
-- нужного вручную: UPDATE profiles SET is_demo = TRUE WHERE id = '...';
UPDATE profiles SET is_demo = TRUE
 WHERE role = 'coach'
   AND (SELECT count(*) FROM profiles WHERE role = 'coach') = 1;

-- ----------------------------------------------------------------------------
-- 2. Генератор кода приглашения. Случайность берём из gen_random_uuid()
--    (встроен в Postgres, криптографически стойкий). Байты 6 и 8 в UUID v4
--    частично фиксированы (версия/вариант), поэтому их не используем.
--    32 символа ^ 8 позиций ≈ 1,1 трлн вариантов — подобрать нереально.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gen_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b BYTEA := uuid_send(gen_random_uuid());
  idx INT;
  code TEXT := '';
BEGIN
  FOREACH idx IN ARRAY ARRAY[0, 1, 2, 3, 4, 5, 7, 9] LOOP
    code := code || substr(alphabet, (get_byte(b, idx) % 32) + 1, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Команды.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  invite_code TEXT NOT NULL UNIQUE DEFAULT gen_invite_code(),
  invite_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_coach ON teams (coach_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_coach_select_own" ON teams;
DROP POLICY IF EXISTS "teams_coach_insert_own" ON teams;
DROP POLICY IF EXISTS "teams_coach_update_own" ON teams;
DROP POLICY IF EXISTS "teams_coach_delete_own" ON teams;

CREATE POLICY "teams_coach_select_own" ON teams
  FOR SELECT USING (coach_id = auth.uid());

-- Создать команду может только аккаунт с ролью coach.
CREATE POLICY "teams_coach_insert_own" ON teams
  FOR INSERT WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'coach')
  );

CREATE POLICY "teams_coach_update_own" ON teams
  FOR UPDATE USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "teams_coach_delete_own" ON teams
  FOR DELETE USING (coach_id = auth.uid());

-- Права на уровне колонок: код приглашения клиент не задаёт никогда.
REVOKE ALL ON teams FROM anon;
REVOKE INSERT, UPDATE ON teams FROM authenticated;
GRANT SELECT, DELETE ON teams TO authenticated;
GRANT INSERT (coach_id, name) ON teams TO authenticated;
GRANT UPDATE (name, invite_active) ON teams TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. team_members: связь с командой и подпись спортсмена.
-- ----------------------------------------------------------------------------
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS athlete_label TEXT;

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);

-- Старая политика давала тренеру ВСЁ, включая вставку чужих спортсменов.
DROP POLICY IF EXISTS "team_coach_manage_own" ON team_members;
DROP POLICY IF EXISTS "team_coach_view_own" ON team_members;
DROP POLICY IF EXISTS "team_coach_remove" ON team_members;
DROP POLICY IF EXISTS "team_athlete_leave" ON team_members;

CREATE POLICY "team_coach_view_own" ON team_members
  FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "team_coach_remove" ON team_members
  FOR DELETE USING (coach_id = auth.uid());

-- "team_athlete_view_own" (SELECT для спортсмена) уже есть из 02 — не трогаем.
CREATE POLICY "team_athlete_leave" ON team_members
  FOR DELETE USING (athlete_id = auth.uid());

-- Вставка и изменение связей — только через join_team() ниже.
REVOKE ALL ON team_members FROM anon;
REVOKE INSERT, UPDATE ON team_members FROM authenticated;
GRANT SELECT, DELETE ON team_members TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Предпросмотр приглашения: только название команды (и состоит ли уже
--    спортсмен в ней). Ни тренера, ни состава команды не раскрывает.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS team_invite_preview(TEXT);
CREATE FUNCTION team_invite_preview(p_code TEXT)
RETURNS TABLE (team_name TEXT, already_member BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.name,
         EXISTS (
           SELECT 1 FROM team_members tm
            WHERE tm.team_id = t.id AND tm.athlete_id = auth.uid()
         )
    FROM teams t
   WHERE t.invite_code = upper(btrim(p_code))
     AND t.invite_active
     AND auth.uid() IS NOT NULL;
$$;

-- ----------------------------------------------------------------------------
-- 6. Вступление в команду. Ошибки — короткие коды, приложение переводит их.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS join_team(TEXT, TEXT);
CREATE FUNCTION join_team(p_code TEXT, p_label TEXT)
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

  -- Новый пользователь может прийти по QR раньше, чем прошёл онбординг:
  -- профиля ещё нет, а team_members ссылается на profiles.
  INSERT INTO profiles (id, role, training_schedule, injury_history, exam_dates, match_dates)
  VALUES (v_uid, 'athlete', '[]', '[]', '{}', '{}')
  ON CONFLICT (id) DO NOTHING;

  SELECT p.role INTO v_role FROM profiles p WHERE p.id = v_uid;
  IF v_role <> 'athlete' THEN
    RAISE EXCEPTION 'NOT_ATHLETE';
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

-- ----------------------------------------------------------------------------
-- 7. Новый код (старый QR сразу перестаёт работать). Только свой команде.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS regenerate_team_invite(UUID);
CREATE FUNCTION regenerate_team_invite(p_team UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  UPDATE teams
     SET invite_code = gen_invite_code()
   WHERE id = p_team AND coach_id = auth.uid()
  RETURNING invite_code INTO v_code;
  IF v_code IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  RETURN v_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION gen_invite_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION team_invite_preview(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION join_team(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION regenerate_team_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION gen_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION team_invite_preview(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_team(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_team_invite(UUID) TO authenticated;

COMMIT;

-- Проверка: кто помечен как демо (ожидается демо-тренер + demo.* аккаунты).
SELECT u.email, p.role, p.is_demo
  FROM profiles p JOIN auth.users u ON u.id = p.id
 WHERE p.is_demo
 ORDER BY p.role, u.email;
