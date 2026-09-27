-- ============================================================================
-- CloudPulse — демо-родитель для показа жюри
-- ============================================================================
-- Перед запуском: Authentication → Users → Add user →
--   demo.parent@cloudpulse.test (любой пароль, "Auto Confirm User" включён).
--
-- Связывает родителя со спортсменом «Скрытая травма» (demo.injury).
-- Согласие сбрасывается в ВЫКЛ — на демо спортсмен включает его сам.
-- Скрипт можно запускать повторно.
-- ============================================================================

DO $$
DECLARE
  v_parent  UUID;
  v_athlete UUID;
BEGIN
  SELECT id INTO v_parent  FROM auth.users WHERE email = 'demo.parent@cloudpulse.test';
  SELECT id INTO v_athlete FROM auth.users WHERE email = 'demo.injury@cloudpulse.test';

  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'Сначала создай demo.parent@cloudpulse.test в Authentication → Users';
  END IF;
  IF v_athlete IS NULL THEN
    RAISE EXCEPTION 'Не найден demo.injury@cloudpulse.test — сначала демо-атлеты (04_seed_demo_data.sql)';
  END IF;

  INSERT INTO profiles (id, role, training_schedule, injury_history, exam_dates, match_dates)
  VALUES (v_parent, 'parent', '[]', '[]', '{}', '{}')
  ON CONFLICT (id) DO UPDATE SET role = 'parent';

  INSERT INTO family_links (athlete_id, parent_id, athlete_label, parent_label, parent_notifications_enabled)
  VALUES (v_athlete, v_parent, 'Макс', 'Мама', FALSE)
  ON CONFLICT (athlete_id, parent_id) DO UPDATE
    SET athlete_label = EXCLUDED.athlete_label,
        parent_label = EXCLUDED.parent_label,
        parent_notifications_enabled = FALSE;
END $$;

-- Проверка
SELECT fl.athlete_label, fl.parent_label, fl.parent_notifications_enabled AS consent,
       fl.consent_changed_at, pr.role AS parent_role
  FROM family_links fl
  JOIN profiles pr ON pr.id = fl.parent_id
  JOIN auth.users u ON u.id = fl.parent_id
 WHERE u.email = 'demo.parent@cloudpulse.test';
