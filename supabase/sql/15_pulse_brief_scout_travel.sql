-- ============================================================================
-- CloudPulse — четыре новые функции (30.09.2026)
-- ============================================================================
--   A. «Пульс команды» — тренер видит ТОЛЬКО суммы по команде (стресс, сон,
--      усталость, забитость по чек-ину), без имён. Меньше 3 чек-инов в день —
--      ничего; счётчики 1–2 отдаются как «меньше 3» (-1). Личные ответы из
--      этой функции не выходят никогда.
--   B. «Предматчевая сводка» для родителя — тот же статус заявки на матч,
--      который видит тренер, только по своему ребёнку и только если спортсмен
--      включил ОБА согласия (цвет дня + календарь). Без баллов, без ACWR,
--      без места боли.
--   C. «Паспорт для скаутов» — одноразовая ссылка: создаёт спортсмен,
--      включает родитель, срок ≤ 30 дней, можно отозвать в любой момент.
--      В базе хранится только SHA-256 ссылки. Скаут видит регулярность
--      чек-инов и тренировок, цвета готовности по месяцам и — только если
--      спортсмен сам включил — число сообщений о боли за 12 месяцев.
--      Школьных оценок нет (подтверждения школой пока нет — не выдумываем).
--   D. «После выезда» — тренер отмечает выездной матч и часы в дороге. При
--      4+ часах дороги туда-обратно 48 часов после возвращения ИИ-тренер
--      даёт только восстановление, а спортсмен может показать учителю
--      подписанную записку (как Safety Pass).
--
-- Демо: при сбросе песочницы ссылки скаутов и выезды демо-аккаунтов удаляются.
-- Скрипт можно запускать повторно.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- A. Пульс команды
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS team_pulse(INT);
CREATE FUNCTION team_pulse(p_days INT DEFAULT 8)
RETURNS TABLE (
  day           DATE,
  team_size     INT,
  checked_in    INT,
  stress_high   INT,
  sleep_poor    INT,
  fatigue_high  INT,
  soreness_high INT,
  strained      INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH team AS (
    SELECT DISTINCT tm.athlete_id FROM team_members tm WHERE tm.coach_id = auth.uid()
  ),
  days AS (
    SELECT generate_series(CURRENT_DATE - (LEAST(GREATEST(COALESCE(p_days, 8), 1), 28) - 1), CURRENT_DATE, INTERVAL '1 day')::date AS day
  ),
  agg AS (
    SELECT d.day,
           count(c.user_id)::int                                                 AS checked_in,
           count(c.user_id) FILTER (WHERE c.stress <= 2)::int                    AS stress_high,
           count(c.user_id) FILTER (WHERE c.sleep_quality <= 2)::int             AS sleep_poor,
           count(c.user_id) FILTER (WHERE c.fatigue <= 2)::int                   AS fatigue_high,
           count(c.user_id) FILTER (WHERE c.soreness <= 2)::int                  AS soreness_high,
           count(c.user_id) FILTER (WHERE c.stress <= 2 OR c.sleep_quality <= 2)::int AS strained
      FROM days d
      LEFT JOIN checkins c ON c.date = d.day AND c.user_id IN (SELECT athlete_id FROM team)
     GROUP BY d.day
  )
  SELECT a.day,
         (SELECT count(*) FROM team)::int,
         a.checked_in,
         CASE WHEN a.checked_in < 3 THEN NULL WHEN a.stress_high   BETWEEN 1 AND 2 THEN -1 ELSE a.stress_high   END,
         CASE WHEN a.checked_in < 3 THEN NULL WHEN a.sleep_poor    BETWEEN 1 AND 2 THEN -1 ELSE a.sleep_poor    END,
         CASE WHEN a.checked_in < 3 THEN NULL WHEN a.fatigue_high  BETWEEN 1 AND 2 THEN -1 ELSE a.fatigue_high  END,
         CASE WHEN a.checked_in < 3 THEN NULL WHEN a.soreness_high BETWEEN 1 AND 2 THEN -1 ELSE a.soreness_high END,
         CASE WHEN a.checked_in < 3 THEN NULL WHEN a.strained      BETWEEN 1 AND 2 THEN -1 ELSE a.strained      END
    FROM agg a
   WHERE EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'coach')
   ORDER BY a.day;
$$;

-- ----------------------------------------------------------------------------
-- B. Предматчевая сводка для родителя
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS parent_match_brief();
CREATE FUNCTION parent_match_brief()
RETURNS TABLE (
  link_id      UUID,
  match_date   DATE,
  checked_in   BOOLEAN,
  zone         TEXT,
  pain_blocked BOOLEAN,
  load_spike   BOOLEAN,
  rtp_state    TEXT,
  clean_days   INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH links AS (
    SELECT fl.id, fl.athlete_id
      FROM family_links fl
     WHERE fl.parent_id = auth.uid()
       AND fl.parent_notifications_enabled
       AND fl.parent_calendar_enabled
  ),
  nxt AS (
    SELECT l.id, l.athlete_id,
           (SELECT min(m.v::date)
              FROM profiles p, unnest(p.match_dates::text[]) AS m(v)
             WHERE p.id = l.athlete_id
               AND m.v ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
               AND m.v::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) AS match_date
      FROM links l
  ),
  rtp AS (
    SELECT n.*, rtp_latest_pain(n.athlete_id) AS pain_date FROM nxt n WHERE n.match_date IS NOT NULL
  )
  SELECT r.id,
         r.match_date,
         c.date IS NOT NULL,
         c.zone::text,
         COALESCE(c.is_pain_blocked, FALSE),
         COALESCE(c.acwr > 1.5, FALSE),
         CASE
           WHEN r.pain_date IS NULL THEN 'none'
           WHEN EXISTS (SELECT 1 FROM rtp_clearances rc WHERE rc.athlete_id = r.athlete_id AND rc.pain_date = r.pain_date) THEN 'cleared'
           WHEN rtp_clean_days(r.athlete_id, r.pain_date) >= 2 THEN 'ready'
           ELSE 'restricted'
         END,
         CASE WHEN r.pain_date IS NULL THEN 0 ELSE rtp_clean_days(r.athlete_id, r.pain_date) END
    FROM rtp r
    LEFT JOIN checkins c ON c.user_id = r.athlete_id AND c.date = CURRENT_DATE;
$$;

-- ----------------------------------------------------------------------------
-- C. Паспорт для скаутов
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scout_shares (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash     TEXT NOT NULL UNIQUE,
  display_name   TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 60),
  recipient      TEXT NOT NULL CHECK (char_length(btrim(recipient)) BETWEEN 1 AND 80),
  show_readiness BOOLEAN NOT NULL DEFAULT TRUE,
  show_health    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  approved_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  view_count     INT NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_scout_shares_athlete ON scout_shares (athlete_id);

-- Никакого прямого доступа: только через функции ниже.
ALTER TABLE scout_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON scout_shares FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON scout_shares FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON scout_shares FROM authenticated'; END IF;
END $$;

CREATE OR REPLACE FUNCTION scout_token_hash(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT encode(sha256(convert_to(p_token, 'UTF8')), 'hex') $$;

DROP FUNCTION IF EXISTS create_scout_share(TEXT, TEXT, INT, BOOLEAN, BOOLEAN);
CREATE FUNCTION create_scout_share(p_display_name TEXT, p_recipient TEXT, p_days INT, p_show_readiness BOOLEAN, p_show_health BOOLEAN)
RETURNS TABLE (share_id UUID, token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_token TEXT;
  v_id    UUID;
  v_exp   TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_uid AND p.role = 'athlete') THEN RAISE EXCEPTION 'NOT_ATHLETE'; END IF;
  IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'BAD_DAYS'; END IF;
  IF p_display_name IS NULL OR char_length(btrim(p_display_name)) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'BAD_NAME'; END IF;
  IF p_recipient IS NULL OR char_length(btrim(p_recipient)) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'BAD_RECIPIENT'; END IF;
  -- Несовершеннолетний: ссылку включает родитель, значит связь с родителем нужна.
  IF NOT EXISTS (SELECT 1 FROM family_links fl WHERE fl.athlete_id = v_uid) THEN RAISE EXCEPTION 'NO_PARENT_LINK'; END IF;
  IF (SELECT count(*) FROM scout_shares s
       WHERE s.athlete_id = v_uid AND s.revoked_at IS NULL AND s.expires_at > now()) >= 3 THEN
    RAISE EXCEPTION 'TOO_MANY_LINKS';
  END IF;

  v_token := encode(uuid_send(gen_random_uuid()), 'hex') || encode(uuid_send(gen_random_uuid()), 'hex');
  v_exp := now() + make_interval(days => p_days);
  INSERT INTO scout_shares (athlete_id, token_hash, display_name, recipient, show_readiness, show_health, expires_at)
  VALUES (v_uid, scout_token_hash(v_token), btrim(p_display_name), btrim(p_recipient),
          COALESCE(p_show_readiness, TRUE), COALESCE(p_show_health, FALSE), v_exp)
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_token, v_exp;
END;
$$;

DROP FUNCTION IF EXISTS my_scout_shares();
CREATE FUNCTION my_scout_shares()
RETURNS TABLE (
  id UUID, display_name TEXT, recipient TEXT, show_readiness BOOLEAN, show_health BOOLEAN,
  created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, approved_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
  view_count INT, last_viewed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.display_name, s.recipient, s.show_readiness, s.show_health, s.created_at, s.expires_at,
         s.approved_at, s.revoked_at, s.view_count, s.last_viewed_at
    FROM scout_shares s
   WHERE s.athlete_id = auth.uid()
     AND s.created_at > now() - INTERVAL '90 days'
   ORDER BY s.created_at DESC;
$$;

DROP FUNCTION IF EXISTS parent_scout_shares();
CREATE FUNCTION parent_scout_shares()
RETURNS TABLE (
  id UUID, athlete_label TEXT, display_name TEXT, recipient TEXT, show_readiness BOOLEAN, show_health BOOLEAN,
  created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, approved_at TIMESTAMPTZ, view_count INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, fl.athlete_label, s.display_name, s.recipient, s.show_readiness, s.show_health,
         s.created_at, s.expires_at, s.approved_at, s.view_count
    FROM scout_shares s
    JOIN family_links fl ON fl.athlete_id = s.athlete_id AND fl.parent_id = auth.uid()
   WHERE s.revoked_at IS NULL AND s.expires_at > now()
   ORDER BY s.created_at DESC;
$$;

DROP FUNCTION IF EXISTS approve_scout_share(UUID);
CREATE FUNCTION approve_scout_share(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE scout_shares s
     SET approved_by = auth.uid(), approved_at = now()
   WHERE s.id = p_id
     AND s.revoked_at IS NULL
     AND s.expires_at > now()
     AND s.approved_at IS NULL
     AND EXISTS (SELECT 1 FROM family_links fl WHERE fl.athlete_id = s.athlete_id AND fl.parent_id = auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
END;
$$;

DROP FUNCTION IF EXISTS revoke_scout_share(UUID);
CREATE FUNCTION revoke_scout_share(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE scout_shares s
     SET revoked_at = now()
   WHERE s.id = p_id
     AND s.revoked_at IS NULL
     AND (s.athlete_id = auth.uid()
          OR EXISTS (SELECT 1 FROM family_links fl WHERE fl.athlete_id = s.athlete_id AND fl.parent_id = auth.uid()));
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
END;
$$;

-- Что видит скаут. Любая неудача — просто {"status":"invalid"}: по ответу нельзя
-- понять, существовала ли ссылка.
DROP FUNCTION IF EXISTS scout_cv(TEXT);
CREATE FUNCTION scout_cv(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s       scout_shares%ROWTYPE;
  v_from  DATE;
  v_to    DATE := CURRENT_DATE;
  v_prof  profiles%ROWTYPE;
  v_disc  JSONB;
  v_ready JSONB;
  v_health JSONB;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT * INTO s FROM scout_shares WHERE token_hash = scout_token_hash(p_token);
  IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.approved_at IS NULL OR s.expires_at <= now() THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  UPDATE scout_shares SET view_count = view_count + 1, last_viewed_at = now() WHERE id = s.id;
  SELECT * INTO v_prof FROM profiles WHERE id = s.athlete_id;

  SELECT GREATEST(min(c.date), CURRENT_DATE - 730) INTO v_from FROM checkins c WHERE c.user_id = s.athlete_id;
  v_from := COALESCE(v_from, CURRENT_DATE);

  -- Регулярность: дни с чек-ином, недели с чек-ином, самая длинная серия, записанные тренировки.
  WITH d AS (
    SELECT DISTINCT c.date FROM checkins c WHERE c.user_id = s.athlete_id AND c.date BETWEEN v_from AND v_to
  ),
  runs AS (
    SELECT count(*) AS len FROM (SELECT date, date - (row_number() OVER (ORDER BY date))::int AS grp FROM d) x GROUP BY grp
  )
  SELECT jsonb_build_object(
           'checkin_days', (SELECT count(*) FROM d),
           'period_days', (v_to - v_from + 1),
           'active_weeks', (SELECT count(DISTINCT date_trunc('week', date)) FROM d),
           'total_weeks', ((date_trunc('week', v_to)::date - date_trunc('week', v_from)::date) / 7 + 1),
           'longest_streak', COALESCE((SELECT max(len) FROM runs), 0),
           'sessions_logged', (SELECT count(*) FROM sessions_log sl WHERE sl.user_id = s.athlete_id AND sl.date BETWEEN v_from AND v_to))
    INTO v_disc;

  IF s.show_readiness THEN
    SELECT COALESCE(jsonb_agg(m ORDER BY m->>'month'), '[]'::jsonb) INTO v_ready
      FROM (
        SELECT jsonb_build_object(
                 'month', to_char(date_trunc('month', c.date), 'YYYY-MM'),
                 'days', count(*),
                 'green', count(*) FILTER (WHERE c.zone::text = 'green'),
                 'yellow', count(*) FILTER (WHERE c.zone::text = 'yellow'),
                 'red', count(*) FILTER (WHERE c.zone::text = 'red'),
                 'avg_score', round(avg(c.readiness_score))) AS m
          FROM checkins c
         WHERE c.user_id = s.athlete_id AND c.date BETWEEN v_from AND v_to
         GROUP BY date_trunc('month', c.date)
      ) q;
  END IF;

  IF s.show_health THEN
    SELECT jsonb_build_object(
             'pain_reports_12m', (SELECT count(*) FROM checkins c WHERE c.user_id = s.athlete_id AND c.pain_flag IS TRUE AND c.date > CURRENT_DATE - 365),
             'returns_confirmed_12m', (SELECT count(*) FROM rtp_clearances rc WHERE rc.athlete_id = s.athlete_id AND rc.pain_date > CURRENT_DATE - 365))
      INTO v_health;
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'ref', upper(left(replace(s.id::text, '-', ''), 8)),
    'display_name', s.display_name,
    'recipient', s.recipient,
    'sport', v_prof.sport,
    'generated_at', now(),
    'expires_at', s.expires_at,
    'period', jsonb_build_object('from', v_from, 'to', v_to),
    'discipline', v_disc,
    'readiness', v_ready,
    'health', v_health);
END;
$$;

-- ----------------------------------------------------------------------------
-- D. Выезды команды
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_trips (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 60),
  match_date   DATE NOT NULL,
  return_date  DATE NOT NULL,
  travel_hours SMALLINT NOT NULL CHECK (travel_hours BETWEEN 1 AND 48),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_trips_dates CHECK (return_date >= match_date AND return_date <= match_date + 7)
);
CREATE INDEX IF NOT EXISTS idx_team_trips_coach ON team_trips (coach_id, return_date);

ALTER TABLE team_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_trips_coach_select" ON team_trips;
DROP POLICY IF EXISTS "team_trips_coach_insert" ON team_trips;
DROP POLICY IF EXISTS "team_trips_coach_delete" ON team_trips;
DROP POLICY IF EXISTS "team_trips_athlete_select" ON team_trips;

CREATE POLICY "team_trips_coach_select" ON team_trips
  FOR SELECT USING (coach_id = (SELECT auth.uid()));
CREATE POLICY "team_trips_coach_insert" ON team_trips
  FOR INSERT WITH CHECK (
    coach_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'coach')
  );
CREATE POLICY "team_trips_coach_delete" ON team_trips
  FOR DELETE USING (coach_id = (SELECT auth.uid()));
CREATE POLICY "team_trips_athlete_select" ON team_trips
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.coach_id = team_trips.coach_id AND tm.athlete_id = (SELECT auth.uid()))
  );

REVOKE ALL ON team_trips FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON team_trips FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON team_trips FROM authenticated';
    EXECUTE 'GRANT SELECT, DELETE ON team_trips TO authenticated';
    EXECUTE 'GRANT INSERT (coach_id, title, match_date, return_date, travel_hours) ON team_trips TO authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Права на функции
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION team_pulse(INT), parent_match_brief(), scout_token_hash(TEXT),
  create_scout_share(TEXT, TEXT, INT, BOOLEAN, BOOLEAN), my_scout_shares(), parent_scout_shares(),
  approve_scout_share(UUID), revoke_scout_share(UUID), scout_cv(TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION team_pulse(INT), parent_match_brief(), scout_token_hash(TEXT),
      create_scout_share(TEXT, TEXT, INT, BOOLEAN, BOOLEAN), my_scout_shares(), parent_scout_shares(),
      approve_scout_share(UUID), revoke_scout_share(UUID) FROM anon';
    -- Скаут без аккаунта: только просмотр по ссылке.
    EXECUTE 'GRANT EXECUTE ON FUNCTION scout_cv(TEXT) TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION team_pulse(INT), parent_match_brief(),
      create_scout_share(TEXT, TEXT, INT, BOOLEAN, BOOLEAN), my_scout_shares(), parent_scout_shares(),
      approve_scout_share(UUID), revoke_scout_share(UUID), scout_cv(TEXT) TO authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Демо: при сбросе удаляются ссылки скаутов и выезды демо-аккаунтов
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION demo_growth_reset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM scout_shares WHERE athlete_id IN (SELECT id FROM profiles WHERE is_demo);
  DELETE FROM team_trips   WHERE coach_id   IN (SELECT id FROM profiles WHERE is_demo);
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION demo_growth_reset() FROM PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_demo_growth ON demo_state';
    EXECUTE 'CREATE TRIGGER trg_demo_growth
               AFTER UPDATE ON demo_state
               FOR EACH ROW EXECUTE FUNCTION demo_growth_reset()';
  END IF;
END $$;

COMMIT;

-- Проверка: 2 строки — scout_shares и team_trips, обе с rowsecurity = true.
SELECT tablename, rowsecurity FROM pg_tables
 WHERE schemaname = 'public' AND tablename IN ('scout_shares', 'team_trips') ORDER BY tablename;
