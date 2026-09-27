-- ============================================================================
-- CloudPulse — школьный календарь (экзамены / контрольные / матчи)
-- ============================================================================
-- Что делает скрипт:
--
-- 1. profiles.exam_subjects — подпись к дате экзамена ("Математика").
--    Формат: {"2026-10-02": "Математика", ...}. Только для отображения,
--    на расчёт не влияет. Сами даты по-прежнему лежат в exam_dates /
--    match_dates — их уже читают и TS-движок, и SQL-триггер.
--
-- 2. Пересчёт при изменении дат. Раньше балл в базе пересчитывался только
--    от чек-ина или тренировки. Если спортсмен добавлял контрольную на
--    завтра ПОСЛЕ утреннего чек-ина, в базе (у тренера, в Safety Pass)
--    оставался старый балл до следующего дня. Теперь любое изменение
--    exam_dates / match_dates сразу пересчитывает чек-ины этого спортсмена
--    той же функцией recompute_checkin_readiness() из 03_readiness_trigger_v2.
--
-- Скрипт можно запускать повторно. Колонки существующих таблиц не меняются.
-- ============================================================================

BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exam_subjects JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION profile_dates_recompute_readiness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recompute_checkin_readiness(c.user_id, c.date)
    FROM checkins c
   WHERE c.user_id = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_dates_recompute ON profiles;
CREATE TRIGGER trg_profile_dates_recompute
  AFTER UPDATE OF exam_dates, match_dates ON profiles
  FOR EACH ROW
  WHEN (OLD.exam_dates IS DISTINCT FROM NEW.exam_dates
        OR OLD.match_dates IS DISTINCT FROM NEW.match_dates)
  EXECUTE FUNCTION profile_dates_recompute_readiness();

COMMIT;
