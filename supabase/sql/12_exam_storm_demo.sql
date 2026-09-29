-- ============================================================================
-- CloudPulse — «Экзаменационный шторм»: демо-данные для жюри (пункт 11)
-- ============================================================================
-- Сама функция шторма работает без SQL: /coach считает её из exam_dates и
-- match_dates профилей команды (это тренеру уже можно читать по RLS
-- profiles_coach_view_team). На экране только числа, без имён.
--
-- Этот скрипт нужен только демо-команде: чтобы шторм было видно, при каждом
-- сбросе песочницы (seed_demo → demo_state) трём демо-спортсменам ставится
-- контрольная через 5 дней, а всей демо-команде — матч через 4 дня.
-- Получается: шторм с +2 по +5 день (3 из 4 в окне контрольных) и матч
-- внутри шторма. На сегодняшние баллы это не влияет: окно контрольной —
-- 3 дня до неё, а до неё 5; предматчевый блок — за день до матча.
--
-- Настоящих тестеров скрипт не трогает (только profiles.is_demo).
-- Скрипт можно запускать повторно.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION demo_exam_storm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam_ids  UUID[];
  v_team_ids  UUID[];
  v_exam_type TEXT;
  v_match_type TEXT;
  v_exam_day  DATE := CURRENT_DATE + 5;
  v_match_day DATE := CURRENT_DATE + 4;
BEGIN
  SELECT array_agg(u.id) INTO v_exam_ids
    FROM auth.users u JOIN profiles p ON p.id = u.id AND p.is_demo
   WHERE u.email IN ('demo.star@cloudpulse.test', 'demo.injury@cloudpulse.test', 'demo.ideal@cloudpulse.test');

  SELECT array_agg(u.id) INTO v_team_ids
    FROM auth.users u JOIN profiles p ON p.id = u.id AND p.is_demo
   WHERE u.email IN ('demo.star@cloudpulse.test', 'demo.injury@cloudpulse.test',
                     'demo.ideal@cloudpulse.test', 'demo.rookie@cloudpulse.test');

  IF v_team_ids IS NULL THEN
    RETURN NULL;
  END IF;

  -- exam_dates / match_dates в разных версиях схемы — date[] или text[]:
  -- берём фактический тип элемента из каталога.
  SELECT replace(format_type(a.atttypid, a.atttypmod), '[]', '') INTO v_exam_type
    FROM pg_attribute a WHERE a.attrelid = 'public.profiles'::regclass AND a.attname = 'exam_dates';
  SELECT replace(format_type(a.atttypid, a.atttypmod), '[]', '') INTO v_match_type
    FROM pg_attribute a WHERE a.attrelid = 'public.profiles'::regclass AND a.attname = 'match_dates';

  IF v_exam_ids IS NOT NULL THEN
    EXECUTE format(
      'UPDATE profiles
          SET exam_dates = COALESCE(exam_dates, ''{}'') || ARRAY[%1$L::%2$s],
              exam_subjects = COALESCE(exam_subjects, ''{}''::jsonb) || jsonb_build_object(%1$L, ''Математика'')
        WHERE id = ANY($1) AND NOT (%1$L::%2$s = ANY(COALESCE(exam_dates, ''{}'')))',
      v_exam_day::text, v_exam_type)
    USING v_exam_ids;
  END IF;

  EXECUTE format(
    'UPDATE profiles
        SET match_dates = COALESCE(match_dates, ''{}'') || ARRAY[%1$L::%2$s]
      WHERE id = ANY($1) AND NOT (%1$L::%2$s = ANY(COALESCE(match_dates, ''{}'')))',
    v_match_day::text, v_match_type)
  USING v_team_ids;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION demo_exam_storm() FROM PUBLIC;

-- Имя триггера важно: триггеры одного события идут по алфавиту.
-- «trg_demo_exams» срабатывает раньше «trg_demo_reset_clears_alerts»
-- (10_coach_alerts.sql), поэтому пересчёт баллов после смены дат не оставит
-- в демо лишних тревог.
DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_demo_exams ON demo_state';
    EXECUTE 'CREATE TRIGGER trg_demo_exams
               AFTER UPDATE ON demo_state
               FOR EACH ROW EXECUTE FUNCTION demo_exam_storm()';
  END IF;
END $$;

-- Сразу применить (не дожидаясь завтрашнего сброса).
DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    UPDATE demo_state SET last_reset = last_reset WHERE id = 1;
  END IF;
END $$;

COMMIT;

-- Проверка: 4 строки. У star / injury / ideal в exam_dates есть дата через
-- 5 дней, у всех четверых в match_dates — через 4 дня.
SELECT u.email, p.exam_dates, p.match_dates
  FROM profiles p JOIN auth.users u ON u.id = p.id
 WHERE u.email IN ('demo.star@cloudpulse.test', 'demo.injury@cloudpulse.test',
                   'demo.ideal@cloudpulse.test', 'demo.rookie@cloudpulse.test')
 ORDER BY u.email;
