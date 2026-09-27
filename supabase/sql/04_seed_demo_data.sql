-- ============================================================================
-- CloudPulse — демо-команда для жюри (4 архетипа, история до 28 дней)
-- ============================================================================
-- С 09_demo_sandbox.sql вся логика живёт в функции seed_demo(), а данные
-- пересоздаются САМИ раз в день при первом входе через /demo. Этот файл
-- нужен только для ручного сброса (например, прямо перед выступлением).
--
-- Ожидаемый результат на /coach (демо-тренер demo.coach@cloudpulse.test):
--   Звезда в зоне риска — 7 / red: ACWR 2.03, экзамен сегодня, 9 дней без
--       отдыха, самочувствие хуже нормы + флаг "занижает усталость"
--   Скрытая травма      — 30 / red: боль (колено) + завтра матч
--   Идеальная форма     — 100 / green: ACWR 1.00
--   Новичок             — 100 / green: ACWR "мало данных" (cold start)
-- ============================================================================

SELECT seed_demo();

-- Итог на сегодня — должно совпасть с /coach.
SELECT tm.team_name, c.readiness_score, c.zone, c.acwr,
       c.is_pain_blocked, c.is_match_day_blocked,
       jsonb_array_length(c.safety_violations) AS safety_blocks
  FROM team_members tm
  JOIN auth.users coach ON coach.id = tm.coach_id AND coach.email = 'demo.coach@cloudpulse.test'
  JOIN checkins c ON c.user_id = tm.athlete_id AND c.date = CURRENT_DATE
 ORDER BY c.readiness_score;
