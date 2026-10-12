-- ============================================================================
-- Lotus 18: тренер больше не читает таблицы напрямую
-- ============================================================================
-- ЗАПУСКАТЬ ТОЛЬКО ПОСЛЕ ТРЁХ ШАГОВ:
--   1. Выполнен 17_hardening.sql.
--   2. Новая версия приложения выложена на Vercel (git push, деплой зелёный).
--   3. Edge-функция передеплоена:  npx supabase functions deploy get-readiness
-- Иначе экран тренера на старой версии покажет пустую команду.
--
-- После скрипта тренер получает данные команды только через функции
-- coach_team_profiles(), coach_team_checkins(), coach_athlete_inputs() из 17.
-- Свои данные каждый читает по политикам "own ..." (они не тронуты).
-- sessions_coach_insert_team (групповая тренировка) оставлена.
--
-- Откат: блок в конце файла (в комментарии).
-- ============================================================================

DROP POLICY IF EXISTS "profiles_coach_view_team" ON profiles;
DROP POLICY IF EXISTS "checkins_coach_view_team" ON checkins;
DROP POLICY IF EXISTS "sessions_coach_view_team" ON sessions_log;

-- Проверка: этих трёх политик в списке быть не должно.
SELECT tablename, policyname FROM pg_policies
 WHERE policyname IN ('profiles_coach_view_team', 'checkins_coach_view_team', 'sessions_coach_view_team');

-- ---------------------------------------------------------------------------
-- ОТКАТ (раскомментировать и выполнить, если экран тренера сломался):
-- ---------------------------------------------------------------------------
-- CREATE POLICY "profiles_coach_view_team" ON profiles FOR SELECT USING (
--   EXISTS (SELECT 1 FROM team_members tm WHERE tm.athlete_id = profiles.id AND tm.coach_id = auth.uid()));
-- CREATE POLICY "checkins_coach_view_team" ON checkins FOR SELECT USING (
--   EXISTS (SELECT 1 FROM team_members tm WHERE tm.athlete_id = checkins.user_id AND tm.coach_id = auth.uid()));
-- CREATE POLICY "sessions_coach_view_team" ON sessions_log FOR SELECT USING (
--   EXISTS (SELECT 1 FROM team_members tm WHERE tm.athlete_id = sessions_log.user_id AND tm.coach_id = auth.uid()));
