-- ============================================================================
-- CloudPulse — доступ родителей (GDPR: согласие + минимизация данных)
-- ============================================================================
-- Принципы:
--   1. Согласие даёт сам спортсмен (переключатель в приложении). По умолчанию
--      доступ ЗАКРЫТ. Время каждого изменения согласия записывается.
--   2. Минимизация (GDPR ст. 5(1)(c), данные о здоровье — ст. 9): родитель
--      НЕ читает таблицы checkins/profiles напрямую. Единственный способ —
--      функция parent_dashboard(), которая отдаёт только статус дня:
--      зона (зелёная/жёлтая/красная) и есть ли ограничения. Никаких ответов
--      о самочувствии, зоны боли, баллов, тренировок и экзаменов.
--   3. Спортсмен может менять ТОЛЬКО флаг согласия своей связи, но не
--      создавать связи и не переназначать родителя (это делает школа).
--
-- Колонка согласия — существующая family_links.parent_notifications_enabled.
-- Скрипт можно запускать повторно.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Подписи для экрана и журнал согласия.
-- ----------------------------------------------------------------------------
ALTER TABLE family_links ADD COLUMN IF NOT EXISTS athlete_label TEXT;       -- как родитель видит ребёнка ("Макс")
ALTER TABLE family_links ADD COLUMN IF NOT EXISTS parent_label TEXT;        -- как спортсмен видит родителя ("Мама")
ALTER TABLE family_links ADD COLUMN IF NOT EXISTS consent_changed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION family_links_consent_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.parent_notifications_enabled IS DISTINCT FROM OLD.parent_notifications_enabled THEN
    NEW.consent_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_family_links_consent_stamp ON family_links;
CREATE TRIGGER trg_family_links_consent_stamp
  BEFORE INSERT OR UPDATE ON family_links
  FOR EACH ROW
  EXECUTE FUNCTION family_links_consent_stamp();

-- ----------------------------------------------------------------------------
-- 2. Спортсмен: видит свои связи и переключает только согласие.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "family_athlete_manage_own" ON family_links;
DROP POLICY IF EXISTS "family_athlete_view_own" ON family_links;
DROP POLICY IF EXISTS "family_athlete_toggle_consent" ON family_links;

CREATE POLICY "family_athlete_view_own" ON family_links
  FOR SELECT USING (athlete_id = auth.uid());

CREATE POLICY "family_athlete_toggle_consent" ON family_links
  FOR UPDATE USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Права на уровне колонок: UPDATE разрешён только для флага согласия.
REVOKE INSERT, UPDATE, DELETE ON family_links FROM authenticated;
GRANT SELECT ON family_links TO authenticated;
GRANT UPDATE (parent_notifications_enabled) ON family_links TO authenticated;
REVOKE ALL ON family_links FROM anon;

-- ----------------------------------------------------------------------------
-- 3. Родитель больше не читает сырые данные.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "checkins_parent_view_if_consented" ON checkins;
DROP POLICY IF EXISTS "profiles_parent_view_linked" ON profiles;

-- ----------------------------------------------------------------------------
-- 4. Единственное окно для родителя: статус на сегодня, только с согласием.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS parent_dashboard();
CREATE FUNCTION parent_dashboard()
RETURNS TABLE (
  link_id        UUID,
  athlete_label  TEXT,
  consent        BOOLEAN,
  checked_in     BOOLEAN,
  zone           readiness_zone,
  restricted     BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fl.id,
         fl.athlete_label,
         fl.parent_notifications_enabled,
         CASE WHEN fl.parent_notifications_enabled THEN c.date IS NOT NULL END,
         c.zone,
         c.is_pain_blocked OR c.is_match_day_blocked
    FROM family_links fl
    LEFT JOIN LATERAL (
      SELECT ch.date, ch.zone, ch.is_pain_blocked, ch.is_match_day_blocked
        FROM checkins ch
       WHERE ch.user_id = fl.athlete_id
         AND ch.date = CURRENT_DATE          -- тот же UTC-«сегодня», что в приложении
         AND fl.parent_notifications_enabled -- без согласия — ничего
    ) c ON TRUE
   WHERE fl.parent_id = auth.uid()
   ORDER BY fl.created_at;
$$;

REVOKE EXECUTE ON FUNCTION parent_dashboard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION parent_dashboard() FROM anon;
GRANT EXECUTE ON FUNCTION parent_dashboard() TO authenticated;

COMMIT;
