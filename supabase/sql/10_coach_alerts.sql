-- ============================================================================
-- CloudPulse — тревога тренеру в реальном времени + реакция в одно нажатие
-- (пункты 7 и 8 дорожной карты)
-- ============================================================================
-- Что делает скрипт:
--
-- 1. Таблица coach_alerts: «у спортсмена сегодня боль» или «красная зона».
--    Создаёт строки ТОЛЬКО база (триггер после пересчёта готовности). Клиент
--    не может ни создать тревогу, ни удалить, ни поменять её напрямую.
--
-- 2. Когда тревога появляется: сразу после того, как движок посчитал чек-ин
--    (recompute_checkin_readiness из 03_readiness_trigger_v2.sql).
--      - боль (is_pain_blocked)        → kind = 'pain'
--      - красная зона без боли          → kind = 'red'
--    Только за сегодня и вчера (офлайн-чек-ин недельной давности — не тревога),
--    и только если у спортсмена есть тренер. /api/checkin сохраняет чек-ин
--    и тренировку двумя запросами подряд — повторная тревога того же вида
--    в течение минуты не создаётся. Если спортсмен исправил чек-ин и боли
--    больше нет — открытая тревога помечается cleared_at.
--
-- 3. Кто видит: тренер своей команды (через team_members) и сам спортсмен
--    («тренер получил сигнал / ответил»). Родитель — нет (он видит только
--    цвет дня, 06_parent_access.sql).
--
-- 4. Реакция: RPC react_to_coach_alert(id, реакция). Три готовых ответа без
--    свободного текста: contact «видел, свяжусь», rest «сегодня отдых»,
--    specialist «к врачу / медсестре / физиотерапевту». Первый ответ
--    окончательный. Отвечает только тренер этого спортсмена.
--
-- 5. Realtime: таблица добавляется в публикацию supabase_realtime, RLS
--    действует и на поток — тренер получает только тревоги своей команды.
--
-- 6. Демо: при сбросе песочницы (seed_demo) тревоги демо-спортсменов
--    удаляются, чтобы живой показ начинался с чистого листа.
--
-- Скрипт можно запускать повторно. Таблицы чек-инов и триггер готовности
-- не меняются.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Таблица
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_date    DATE NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('pain', 'red')),
  pain_zone       TEXT,
  readiness_score INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  cleared_at      TIMESTAMPTZ,
  reaction        TEXT CHECK (reaction IN ('contact', 'rest', 'specialist')),
  reacted_at      TIMESTAMPTZ,
  reacted_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT coach_alerts_reaction_has_time CHECK ((reaction IS NULL) = (reacted_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_coach_alerts_athlete_date ON coach_alerts (athlete_id, checkin_date);

ALTER TABLE coach_alerts ENABLE ROW LEVEL SECURITY;

-- Клиент может только читать (и только то, что разрешат политики ниже).
REVOKE ALL ON coach_alerts FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON coach_alerts FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON coach_alerts FROM authenticated';
    EXECUTE 'GRANT SELECT ON coach_alerts TO authenticated';
  END IF;
END $$;

DROP POLICY IF EXISTS "coach_alerts_coach_view_team" ON coach_alerts;
CREATE POLICY "coach_alerts_coach_view_team" ON coach_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.athlete_id = coach_alerts.athlete_id AND tm.coach_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "coach_alerts_athlete_view_own" ON coach_alerts;
CREATE POLICY "coach_alerts_athlete_view_own" ON coach_alerts
  FOR SELECT USING (athlete_id = (SELECT auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. Триггер: тревога после пересчёта готовности
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_coach_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind TEXT;
BEGIN
  -- Реагируем только на запись движка (recompute_checkin_readiness ставит
  -- этот флаг). Прямой UPDATE клиента всё равно откатит guard-триггер.
  IF current_setting('cloudpulse.recompute', true) IS DISTINCT FROM 'on' THEN
    RETURN NULL;
  END IF;

  IF NEW.is_pain_blocked THEN
    v_kind := 'pain';
  ELSIF NEW.zone = 'red' THEN
    v_kind := 'red';
  END IF;

  -- Боли больше нет (чек-ин исправлен) — закрываем неотвеченную «боль».
  -- Если и красной зоны нет — закрываем все неотвеченные тревоги за день.
  UPDATE coach_alerts
     SET cleared_at = now()
   WHERE athlete_id = NEW.user_id
     AND checkin_date = NEW.date
     AND cleared_at IS NULL
     AND reacted_at IS NULL
     AND (v_kind IS NULL OR (v_kind = 'red' AND kind = 'pain'));

  IF v_kind IS NULL THEN
    RETURN NULL;
  END IF;

  -- Старые даты (офлайн-очередь до 7 дней) — не тревога.
  IF NEW.date < CURRENT_DATE - 1 THEN
    RETURN NULL;
  END IF;

  -- Нет тренера — некому сигналить (и спортсмену нельзя писать
  -- «тренер получил сигнал»).
  IF NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.athlete_id = NEW.user_id) THEN
    RETURN NULL;
  END IF;

  -- Чек-ин и тренировка приходят двумя запросами подряд: вторая запись
  -- не должна давать второй сигнал.
  IF EXISTS (
    SELECT 1 FROM coach_alerts a
     WHERE a.athlete_id = NEW.user_id
       AND a.checkin_date = NEW.date
       AND a.cleared_at IS NULL
       AND (a.kind = v_kind OR a.kind = 'pain')
       AND a.created_at > now() - INTERVAL '1 minute'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO coach_alerts (athlete_id, checkin_date, kind, pain_zone, readiness_score)
  VALUES (
    NEW.user_id,
    NEW.date,
    v_kind,
    CASE WHEN v_kind = 'pain' THEN NULLIF(btrim(NEW.pain_zone), '') END,
    NEW.readiness_score
  );
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION notify_coach_on_checkin() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notify_coach ON checkins;
CREATE TRIGGER trg_notify_coach
  AFTER UPDATE OF zone, is_pain_blocked ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION notify_coach_on_checkin();

-- Удалили чек-ин — удаляем и тревоги за этот день.
CREATE OR REPLACE FUNCTION delete_alerts_with_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM coach_alerts WHERE athlete_id = OLD.user_id AND checkin_date = OLD.date;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_alerts_with_checkin() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_delete_alerts_with_checkin ON checkins;
CREATE TRIGGER trg_delete_alerts_with_checkin
  AFTER DELETE ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION delete_alerts_with_checkin();

-- ----------------------------------------------------------------------------
-- 3. Реакция тренера в одно нажатие
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION react_to_coach_alert(p_alert_id UUID, p_reaction TEXT)
RETURNS SETOF coach_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_alert coach_alerts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_reaction IS NULL OR p_reaction NOT IN ('contact', 'rest', 'specialist') THEN
    RAISE EXCEPTION 'BAD_REACTION';
  END IF;

  SELECT * INTO v_alert FROM coach_alerts WHERE id = p_alert_id;
  -- Чужая или несуществующая тревога выглядят одинаково.
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.coach_id = v_uid AND tm.athlete_id = v_alert.athlete_id
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  -- Отвечаем на эту тревогу и на все открытые тревоги этого спортсмена
  -- за тот же день. Уже отвеченные не меняются: первый ответ окончательный.
  RETURN QUERY
  UPDATE coach_alerts
     SET reaction = p_reaction, reacted_at = now(), reacted_by = v_uid
   WHERE athlete_id = v_alert.athlete_id
     AND checkin_date = v_alert.checkin_date
     AND reacted_at IS NULL
     AND (id = p_alert_id OR cleared_at IS NULL)
  RETURNING *;
END;
$$;

REVOKE EXECUTE ON FUNCTION react_to_coach_alert(UUID, TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION react_to_coach_alert(UUID, TEXT) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION react_to_coach_alert(UUID, TEXT) TO authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'coach_alerts'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE coach_alerts';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Демо: сброс песочницы очищает тревоги демо-спортсменов.
--    seed_demo() в конце обновляет demo_state — вешаемся на это.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clear_demo_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM coach_alerts
   WHERE athlete_id IN (SELECT id FROM profiles WHERE is_demo);
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION clear_demo_alerts() FROM PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_demo_reset_clears_alerts ON demo_state';
    EXECUTE 'CREATE TRIGGER trg_demo_reset_clears_alerts
               AFTER UPDATE ON demo_state
               FOR EACH ROW EXECUTE FUNCTION clear_demo_alerts()';
  END IF;
END $$;

COMMIT;

-- Проверка: должно быть 1 строка (таблица в Realtime-публикации).
SELECT schemaname, tablename
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime' AND tablename = 'coach_alerts';
