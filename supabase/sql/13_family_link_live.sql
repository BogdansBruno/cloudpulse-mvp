-- ============================================================================
-- CloudPulse — родитель: календарь по отдельному согласию, неделя цветов,
-- «тренер в курсе»; живая связь экранов тренера (Realtime)
-- ============================================================================
-- 1. Второе согласие: family_links.parent_calendar_enabled.
--    Первое (parent_notifications_enabled) по-прежнему открывает только цвет
--    дня. Второе открывает родителю календарь ребёнка: даты контрольных и
--    матчей (без названий предметов). Оба переключателя — только у самого
--    спортсмена, по умолчанию ВЫКЛ, время каждого изменения записывается.
--
-- 2. parent_overview() — единственное окно родителя (как parent_dashboard,
--    которая остаётся для совместимости). По согласию на цвет:
--      today — цвет сегодня и есть ли ограничения;
--      week  — цвет каждого из 7 последних дней (или «не было чек-ина»);
--      coach — если сегодня был сигнал тренеру: получил / ответил и какой
--              ответ («Сегодня отдых» и т. п.). Причина сигнала не отдаётся.
--    По согласию на календарь:
--      calendar — даты контрольных и матчей на ближайшие 16 дней.
--    Баллы, ответы о самочувствии, зона боли, тренировки — никогда.
--
-- 3. Realtime для экрана тренера: checkins, profiles, rtp_followups.
--    RLS действует и на поток: тренер получает только свою команду,
--    родитель — ничего (у него нет доступа к этим таблицам).
--
-- 4. Демо: сброс песочницы выключает календарное согласие демо-спортсменов
--    (как и согласие на цвет в seed_demo) — на показе его включает сам
--    спортсмен.
--
-- Скрипт можно запускать повторно.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Второе согласие
-- ----------------------------------------------------------------------------
ALTER TABLE family_links ADD COLUMN IF NOT EXISTS parent_calendar_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE family_links ADD COLUMN IF NOT EXISTS calendar_consent_changed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION family_links_consent_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.consent_changed_at := NOW();
    NEW.calendar_consent_changed_at := NOW();
    RETURN NEW;
  END IF;
  IF NEW.parent_notifications_enabled IS DISTINCT FROM OLD.parent_notifications_enabled THEN
    NEW.consent_changed_at := NOW();
  END IF;
  IF NEW.parent_calendar_enabled IS DISTINCT FROM OLD.parent_calendar_enabled THEN
    NEW.calendar_consent_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Спортсмен по-прежнему может менять ТОЛЬКО флаги согласия.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT UPDATE (parent_notifications_enabled, parent_calendar_enabled) ON family_links TO authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Окно родителя
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS parent_overview();
CREATE FUNCTION parent_overview()
RETURNS TABLE (
  link_id          UUID,
  athlete_label    TEXT,
  consent          BOOLEAN,
  calendar_consent BOOLEAN,
  today            JSONB,
  week             JSONB,
  coach            JSONB,
  calendar         JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fl.id,
    fl.athlete_label,
    fl.parent_notifications_enabled,
    fl.parent_calendar_enabled,

    CASE WHEN fl.parent_notifications_enabled THEN (
      SELECT jsonb_build_object(
               'checked_in', c.date IS NOT NULL,
               'zone', c.zone,
               'restricted', COALESCE(c.is_pain_blocked OR c.is_match_day_blocked, FALSE))
        FROM (SELECT 1) one
        LEFT JOIN checkins c ON c.user_id = fl.athlete_id AND c.date = CURRENT_DATE
    ) END,

    CASE WHEN fl.parent_notifications_enabled THEN (
      SELECT jsonb_agg(jsonb_build_object('date', d.day, 'zone', c.zone, 'checked_in', c.date IS NOT NULL) ORDER BY d.day)
        FROM (SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, INTERVAL '1 day')::date AS day) d
        LEFT JOIN checkins c ON c.user_id = fl.athlete_id AND c.date = d.day
    ) END,

    CASE WHEN fl.parent_notifications_enabled THEN (
      SELECT jsonb_build_object(
               'state', CASE WHEN a.reacted_at IS NULL THEN 'waiting' ELSE 'answered' END,
               'reaction', a.reaction,
               'at', COALESCE(a.reacted_at, a.created_at))
        FROM coach_alerts a
       WHERE a.athlete_id = fl.athlete_id
         AND a.checkin_date = CURRENT_DATE
         AND a.cleared_at IS NULL
       ORDER BY a.created_at DESC
       LIMIT 1
    ) END,

    CASE WHEN fl.parent_calendar_enabled THEN (
      SELECT jsonb_build_object(
               'exams', COALESCE((
                 SELECT jsonb_agg(DISTINCT e.v::date ORDER BY e.v::date)
                   FROM unnest(p.exam_dates::text[]) AS e(v)
                  WHERE e.v ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                    AND e.v::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 16), '[]'::jsonb),
               'matches', COALESCE((
                 SELECT jsonb_agg(DISTINCT m.v::date ORDER BY m.v::date)
                   FROM unnest(p.match_dates::text[]) AS m(v)
                  WHERE m.v ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                    AND m.v::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 16), '[]'::jsonb))
        FROM profiles p
       WHERE p.id = fl.athlete_id
    ) END
  FROM family_links fl
  WHERE fl.parent_id = auth.uid()
  ORDER BY fl.created_at;
$$;

REVOKE EXECUTE ON FUNCTION parent_overview() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION parent_overview() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION parent_overview() TO authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Realtime: экран тренера обновляется сам
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['checkins', 'profiles', 'rtp_followups'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Демо: календарное согласие выключается при сбросе песочницы
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION demo_family_reset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE family_links
     SET parent_calendar_enabled = FALSE
   WHERE parent_calendar_enabled
     AND athlete_id IN (SELECT id FROM profiles WHERE is_demo);
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION demo_family_reset() FROM PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_demo_family ON demo_state';
    EXECUTE 'CREATE TRIGGER trg_demo_family
               AFTER UPDATE ON demo_state
               FOR EACH ROW EXECUTE FUNCTION demo_family_reset()';
  END IF;
END $$;

COMMIT;

-- Проверка: должно быть 5 строк (coach_alerts, rtp_clearances, checkins,
-- profiles, rtp_followups — все в Realtime).
SELECT tablename
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND tablename IN ('coach_alerts', 'rtp_clearances', 'checkins', 'profiles', 'rtp_followups')
 ORDER BY tablename;
