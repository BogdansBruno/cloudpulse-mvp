-- ============================================================================
-- Lotus 17: hardening (бан на стороне сервера, данные тренера, приватность)
-- ============================================================================
-- Запускать в Supabase -> SQL Editor целиком. Скрипт можно запускать повторно.
-- Этот файл только ДОБАВЛЯЕТ и закрывает публичное чтение бан-листа. Он ничего
-- не ломает в уже работающем приложении. Закрытие прямого чтения тренером
-- (checkins/profiles/sessions_log) вынесено в 18_coach_lockdown.sql и
-- запускается ПОСЛЕ того, как новая версия приложения выложена на Vercel и
-- Edge-функция get-readiness передеплоена.
--
-- Что делает:
--   1. is_blocked() / my_access_status(): забаненный пользователь или режим
--      lockdown блокируются НА СЕРВЕРЕ: restrictive-политики на таблицах
--      с данными. Таблицы banned_users и app_control больше не читаются
--      публично, видны только владельцу.
--   2. RPC для тренера: coach_team_profiles(), coach_team_checkins(),
--      coach_athlete_inputs(). Тренер получает вычисленные поля, а не таблицы.
--   3. Приватность: deletion_requests, delete_my_data() (удаление данных в
--      один вызов), profiles.guardian_consent_at и серверная проверка:
--      несовершеннолетний не может включить доступ родителю или школе без
--      подтверждения опекуна.
--
-- Email владельца ниже ДОЛЖЕН совпадать с NEXT_PUBLIC_ADMIN_EMAILS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Бан и lockdown на сервере
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blocked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN FALSE
    WHEN lower(coalesce(auth.jwt() ->> 'email', '')) = 'bogdanshomebox3@gmail.com' THEN FALSE
    ELSE
      EXISTS (
        SELECT 1 FROM public.banned_users b
         WHERE lower(b.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      OR coalesce((SELECT a.lockdown FROM public.app_control a WHERE a.id = 1), FALSE)
  END;
$$;

REVOKE ALL ON FUNCTION public.is_blocked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked() TO authenticated;

-- Что показать на экране блокировки: только про себя, без чтения списка.
CREATE OR REPLACE FUNCTION public.my_access_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN jsonb_build_object('blocked', FALSE)
    WHEN lower(coalesce(auth.jwt() ->> 'email', '')) = 'bogdanshomebox3@gmail.com'
      THEN jsonb_build_object('blocked', FALSE)
    WHEN EXISTS (
      SELECT 1 FROM public.banned_users b
       WHERE lower(b.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    ) THEN jsonb_build_object(
      'blocked', TRUE,
      'reason', 'banned',
      'ban_reason', (SELECT b.reason FROM public.banned_users b
                      WHERE lower(b.email) = lower(coalesce(auth.jwt() ->> 'email', '')) LIMIT 1)
    )
    WHEN coalesce((SELECT a.lockdown FROM public.app_control a WHERE a.id = 1), FALSE)
      THEN jsonb_build_object('blocked', TRUE, 'reason', 'lockdown')
    ELSE jsonb_build_object('blocked', FALSE)
  END;
$$;

REVOKE ALL ON FUNCTION public.my_access_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_access_status() TO authenticated;

-- banned_users и app_control: публичное чтение закрыто. Читает и пишет только
-- владелец. Остальным отвечает my_access_status().
DROP POLICY IF EXISTS "app_control read" ON app_control;
DROP POLICY IF EXISTS "banned_users read" ON banned_users;

DROP POLICY IF EXISTS "app_control admin read" ON app_control;
CREATE POLICY "app_control admin read" ON app_control
  FOR SELECT USING (auth.jwt() ->> 'email' = 'bogdanshomebox3@gmail.com');

-- ("banned_users admin write" уже FOR ALL, поэтому даёт владельцу и SELECT.)

-- Restrictive-политика: забаненный или заблокированный пользователь не читает
-- и не пишет данные, даже если обойдёт интерфейс. Применяется только к
-- существующим таблицам.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'checkins', 'sessions_log', 'team_members', 'teams',
    'family_links', 'coach_alerts', 'rtp_followups', 'rtp_clearances',
    'soreness_maps', 'scout_shares', 'team_trips', 'schools', 'school_members'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "block_banned" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "block_banned" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
        || 'USING ((SELECT NOT public.is_blocked())) WITH CHECK ((SELECT NOT public.is_blocked()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Тренер получает вычисленное, а не таблицы
-- ---------------------------------------------------------------------------
-- Профили команды: только то, что нужно экрану тренера.
CREATE OR REPLACE FUNCTION public.coach_team_profiles()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_blocked() THEN '[]'::jsonb ELSE
    coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'sport', p.sport,
      'age', p.age,
      'exam_dates', p.exam_dates,
      'match_dates', p.match_dates
    )), '[]'::jsonb)
  END
  FROM public.profiles p
  JOIN public.team_members tm ON tm.athlete_id = p.id
 WHERE tm.coach_id = auth.uid();
$$;

-- Отметки команды за период: только вычисленные поля и флаг боли.
-- Ответы 1-7 (сон, стресс, усталость, боль в мышцах) тренеру не отдаются.
CREATE OR REPLACE FUNCTION public.coach_team_checkins(p_since DATE, p_until DATE)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_blocked() THEN '[]'::jsonb ELSE
    coalesce(jsonb_agg(jsonb_build_object(
      'user_id', c.user_id,
      'date', c.date,
      'pain_flag', c.pain_flag,
      'pain_zone', c.pain_zone,
      'readiness_score', c.readiness_score,
      'zone', c.zone::text,
      'acwr', c.acwr,
      'is_pain_blocked', c.is_pain_blocked
    )), '[]'::jsonb)
  END
  FROM public.checkins c
  JOIN public.team_members tm ON tm.athlete_id = c.user_id
 WHERE tm.coach_id = auth.uid()
   AND c.date::date BETWEEN p_since AND p_until;
$$;

-- Входы расчёта готовности для ОДНОГО спортсмена команды (Edge-функция
-- get-readiness считает по ним ту же формулу, что и приложение).
CREATE OR REPLACE FUNCTION public.coach_athlete_inputs(p_athlete UUID, p_sessions_since DATE, p_checkins_since DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF auth.uid() IS NULL OR public.is_blocked() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
     WHERE tm.coach_id = auth.uid() AND tm.athlete_id = p_athlete
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'sessions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', s.date, 'rpe', s.rpe, 'duration_minutes', s.duration_minutes))
        FROM public.sessions_log s
       WHERE s.user_id = p_athlete AND s.date::date >= p_sessions_since
    ), '[]'::jsonb),
    'checkins', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'date', c.date, 'sleep_quality', c.sleep_quality, 'stress', c.stress,
               'fatigue', c.fatigue, 'soreness', c.soreness,
               'pain_flag', c.pain_flag, 'pain_zone', c.pain_zone))
        FROM public.checkins c
       WHERE c.user_id = p_athlete AND c.date::date >= p_checkins_since
    ), '[]'::jsonb),
    'profile', (
      SELECT jsonb_build_object('exam_dates', p.exam_dates, 'match_dates', p.match_dates)
        FROM public.profiles p WHERE p.id = p_athlete
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.coach_team_profiles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.coach_team_checkins(DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.coach_athlete_inputs(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_team_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_team_checkins(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_athlete_inputs(UUID, DATE, DATE) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Приватность: удаление данных и согласие опекуна
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  email           TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_deleted_at TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'requested',
  note            TEXT
);
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deletion_requests own read" ON public.deletion_requests;
CREATE POLICY "deletion_requests own read" ON public.deletion_requests
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "deletion_requests admin all" ON public.deletion_requests;
CREATE POLICY "deletion_requests admin all" ON public.deletion_requests
  FOR ALL USING (auth.jwt() ->> 'email' = 'bogdanshomebox3@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'bogdanshomebox3@gmail.com');

REVOKE ALL ON public.deletion_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.deletion_requests FROM authenticated;
GRANT SELECT ON public.deletion_requests TO authenticated;

-- Один вызов: записывает запрос и удаляет данные пользователя. Остальные
-- таблицы (команда, семья, школа, тревоги, RTP, скаут) удаляются каскадом
-- вместе со строкой профиля. Запись в auth.users удаляет владелец проекта
-- (Authentication -> Users), поэтому статус остаётся 'data_deleted'.
CREATE OR REPLACE FUNCTION public.delete_my_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  mail TEXT := auth.jwt() ->> 'email';
  rid UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.deletion_requests (user_id, email) VALUES (uid, mail) RETURNING id INTO rid;

  BEGIN
    DELETE FROM public.checkins WHERE user_id = uid;
    DELETE FROM public.sessions_log WHERE user_id = uid;
    IF to_regclass('public.soreness_maps') IS NOT NULL THEN
      EXECUTE 'DELETE FROM public.soreness_maps WHERE user_id = $1' USING uid;
    END IF;
    DELETE FROM public.profiles WHERE id = uid;
    UPDATE public.deletion_requests SET status = 'data_deleted', data_deleted_at = NOW() WHERE id = rid;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.deletion_requests SET status = 'failed', note = left(SQLERRM, 200) WHERE id = rid;
    RETURN jsonb_build_object('ok', FALSE, 'request_id', rid);
  END;

  RETURN jsonb_build_object('ok', TRUE, 'request_id', rid);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_data() TO authenticated;

-- Подтверждение опекуна (самоподтверждение с отметкой времени, не проверка
-- личности). Нужно несовершеннолетнему, чтобы включить доступ родителю или школе.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_consent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.require_guardian_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  new_j JSONB := to_jsonb(NEW);
  old_j JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  flag TEXT;
  turning_on BOOLEAN := FALSE;
BEGIN
  -- Какие флаги согласия есть в этой таблице (колонки могут отсутствовать,
  -- если SQL 13 не запускался), поэтому читаем через jsonb, а не NEW.колонка.
  FOREACH flag IN ARRAY CASE TG_TABLE_NAME
    WHEN 'family_links' THEN ARRAY['parent_notifications_enabled', 'parent_calendar_enabled']
    ELSE ARRAY['consent_safety', 'consent_calendar']
  END
  LOOP
    IF coalesce((new_j ->> flag)::boolean, FALSE) AND NOT coalesce((old_j ->> flag)::boolean, FALSE) THEN
      turning_on := TRUE;
    END IF;
  END LOOP;

  IF NOT turning_on THEN
    RETURN NEW;
  END IF;

  SELECT pr.age, pr.guardian_consent_at, coalesce(pr.is_demo, FALSE) AS is_demo
    INTO p
    FROM public.profiles pr
   WHERE pr.id = NEW.athlete_id;

  IF FOUND AND NOT p.is_demo AND p.age IS NOT NULL AND p.age < 18 AND p.guardian_consent_at IS NULL THEN
    RAISE EXCEPTION 'guardian_consent_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_family_links_guardian ON public.family_links;
CREATE TRIGGER trg_family_links_guardian
  BEFORE INSERT OR UPDATE ON public.family_links
  FOR EACH ROW EXECUTE FUNCTION public.require_guardian_consent();

DO $$
BEGIN
  IF to_regclass('public.school_members') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_school_members_guardian ON public.school_members';
    EXECUTE 'CREATE TRIGGER trg_school_members_guardian BEFORE INSERT OR UPDATE ON public.school_members '
         || 'FOR EACH ROW EXECUTE FUNCTION public.require_guardian_consent()';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Проверка (каждая строка должна дать результат)
-- ---------------------------------------------------------------------------
SELECT proname FROM pg_proc
 WHERE proname IN ('is_blocked', 'my_access_status', 'coach_team_profiles', 'coach_team_checkins',
                   'coach_athlete_inputs', 'delete_my_data', 'require_guardian_consent')
 ORDER BY proname;                                  -- 7 строк

SELECT tablename, policyname FROM pg_policies
 WHERE policyname = 'block_banned' ORDER BY tablename; -- по одной на таблицу

SELECT policyname FROM pg_policies
 WHERE tablename IN ('banned_users', 'app_control');  -- публичных "read" быть не должно
