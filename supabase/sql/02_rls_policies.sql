-- ============================================================================
-- CloudPulse — RLS-политики (шаг 2), адаптированные под РЕАЛЬНУЮ схему
-- ============================================================================
-- Заменяет cloudpulse_rls_policies.sql (тот файл использовал несуществующие
-- имена athlete_id/trainings). Проверено через pg_policies: на
-- profiles/checkins/sessions_log уже есть рабочие политики "own profile" /
-- "own checkins" / "own sessions" — полный CRUD, но строго для владельца.
-- Они НЕ трогаются. Ниже только ДОБАВЛЯЮТСЯ новые политики для команды/семьи.
-- Политики RLS складываются через OR (permissive по умолчанию) — новая
-- политика не может отобрать то, что уже разрешено существующей.
-- ============================================================================

-- ----------------------------------------------------------------------
-- team_members (RLS уже включён в cloudpulse_schema_retrofit.sql)
-- ----------------------------------------------------------------------
CREATE POLICY "team_coach_manage_own" ON team_members
  FOR ALL USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "team_athlete_view_own" ON team_members
  FOR SELECT USING (athlete_id = auth.uid());

-- ----------------------------------------------------------------------
-- family_links — атлет управляет согласием, родитель видит свою связь.
-- ----------------------------------------------------------------------
CREATE POLICY "family_athlete_manage_own" ON family_links
  FOR ALL USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "family_parent_view_own_link" ON family_links
  FOR SELECT USING (parent_id = auth.uid());

-- ----------------------------------------------------------------------
-- profiles — ДОБАВЛЯЕМ тренеру и родителю право видеть чужой профиль
-- (существующие политики владельца не трогаются).
-- ----------------------------------------------------------------------
CREATE POLICY "profiles_coach_view_team" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.athlete_id = profiles.id AND tm.coach_id = auth.uid()
    )
  );

CREATE POLICY "profiles_parent_view_linked" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_links fl
      WHERE fl.athlete_id = profiles.id AND fl.parent_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------
-- checkins — ДОБАВЛЯЕМ SELECT-only тренеру и родителю. Ни один из них
-- не получает INSERT/UPDATE/DELETE — существующая "own checkins" (ALL,
-- только владелец) остаётся единственным способом что-либо изменить.
-- ----------------------------------------------------------------------
CREATE POLICY "checkins_coach_view_team" ON checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.athlete_id = checkins.user_id AND tm.coach_id = auth.uid()
    )
  );

CREATE POLICY "checkins_parent_view_if_consented" ON checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_links fl
      WHERE fl.athlete_id = checkins.user_id
        AND fl.parent_id = auth.uid()
        AND fl.parent_notifications_enabled = TRUE
    )
  );

-- ----------------------------------------------------------------------
-- sessions_log — ДОБАВЛЯЕМ тренеру SELECT + INSERT для своей команды
-- (например, групповая тренировка с общим RPE). Существующая
-- "own sessions" (ALL, только владелец) не трогается.
-- ----------------------------------------------------------------------
CREATE POLICY "sessions_coach_view_team" ON sessions_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.athlete_id = sessions_log.user_id AND tm.coach_id = auth.uid()
    )
  );

CREATE POLICY "sessions_coach_insert_team" ON sessions_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.athlete_id = sessions_log.user_id AND tm.coach_id = auth.uid()
    )
  );

-- ============================================================================
-- Известные ограничения (без изменений относительно прошлой версии):
-- 1. school_admin не имеет отдельной широкой видимости по школе — работает
--    как ещё один коуч через team_members (нет таблицы institutions).
-- 2. В sessions_log нет колонки created_by — коуч и атлет неразличимы как
--    авторы конкретной тренировки. Не критично для MVP/демо.
-- ============================================================================
