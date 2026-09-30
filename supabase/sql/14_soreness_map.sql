-- ============================================================================
-- CloudPulse — карта усталости в чек-ине (ADP, интеграция шаг 1)
-- ============================================================================
-- Спортсмен в чек-ине может отметить на силуэте, КАКИЕ мышцы забиты
-- (18 зон, уровень 1–5). Эту карту потом читает ИИ-тренер, чтобы дать
-- забитой мышце только мягкую работу.
--
-- Почему отдельная таблица, а не колонка в checkins:
--   - checkins по RLS видит тренер (и он в Realtime-публикации) — карта же
--     личная: её видит и пишет ТОЛЬКО сам спортсмен. Тренер и родитель
--     по-прежнему видят только общий балл забитости и цвет дня.
--   - Движок готовности, триггеры пересчёта и Safety Pass не меняются:
--     карта в балл не входит. Если этот скрипт не запущен, чек-ин работает
--     как раньше (сервер просто не сохранит карту).
--
-- Формат — тот же, что в adp.check_ins.soreness_zones:
--   [{"zone_id":"quadriceps","side":"both","severity":4}, ...]  (≤ 6 записей)
-- Скрипт можно запускать повторно.
-- ============================================================================

BEGIN;

-- 1. Проверка формата (та же, что adp.valid_soreness_zones в adp/db/migrations/002).
CREATE OR REPLACE FUNCTION public.valid_soreness_zones(z jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT jsonb_typeof(z) = 'array'
     AND jsonb_array_length(z) <= 6
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(z) AS e(v)
        WHERE NOT (
              jsonb_typeof(e.v) = 'object'
          AND (SELECT count(*) FROM jsonb_object_keys(e.v)) = 3
          AND (e.v ->> 'zone_id') = ANY (ARRAY[
                'chest', 'shoulder_front', 'biceps', 'forearm', 'abdominals', 'obliques',
                'hip_flexors', 'adductors', 'quadriceps', 'shins',
                'neck_upper_traps', 'shoulder_back', 'upper_back', 'lower_back',
                'triceps', 'glutes', 'hamstrings', 'calves'])
          AND (e.v ->> 'side') = ANY (ARRAY['left', 'right', 'both', 'center'])
          AND ((e.v ->> 'zone_id') = ANY (ARRAY[
                'shoulder_front', 'biceps', 'forearm', 'obliques', 'hip_flexors', 'adductors',
                'quadriceps', 'shins', 'shoulder_back', 'triceps', 'glutes', 'hamstrings', 'calves']))
              = ((e.v ->> 'side') <> 'center')
          AND jsonb_typeof(e.v -> 'severity') = 'number'
          AND (e.v ->> 'severity') ~ '^[1-5]$'
        )
     )
     AND (SELECT count(*) FROM jsonb_array_elements(z))
       = (SELECT count(DISTINCT (e.v ->> 'zone_id') || ':' || (e.v ->> 'side')) FROM jsonb_array_elements(z) AS e(v));
$$;

REVOKE EXECUTE ON FUNCTION public.valid_soreness_zones(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_soreness_zones(jsonb) TO authenticated, service_role;

-- 2. Таблица: одна карта на спортсмена в день (как checkins).
CREATE TABLE IF NOT EXISTS public.soreness_maps (
  user_id    uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date       date        NOT NULL,
  zones      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date),
  CONSTRAINT soreness_maps_zones_valid CHECK (public.valid_soreness_zones(zones))
);

-- 3. Доступ: только сам спортсмен. Никаких политик для тренера и родителя.
ALTER TABLE public.soreness_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soreness_maps_own" ON public.soreness_maps;
CREATE POLICY "soreness_maps_own" ON public.soreness_maps
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.soreness_maps FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soreness_maps TO authenticated;

-- 4. Демо: при каждом сбросе песочницы у демо-спортсменов карта очищается,
--    а у «звезды» (demo.star) на сегодня забит квадрицепс 4/5 с двух сторон —
--    чтобы жюри сразу увидело, как ИИ-тренер даёт бедру только мягкую работу.
CREATE OR REPLACE FUNCTION demo_soreness_maps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_star UUID;
BEGIN
  DELETE FROM soreness_maps
   WHERE user_id IN (SELECT id FROM profiles WHERE is_demo);

  SELECT u.id INTO v_star
    FROM auth.users u JOIN profiles p ON p.id = u.id AND p.is_demo
   WHERE u.email = 'demo.star@cloudpulse.test';

  IF v_star IS NOT NULL THEN
    INSERT INTO soreness_maps (user_id, date, zones)
    VALUES (v_star, CURRENT_DATE, '[{"zone_id":"quadriceps","side":"both","severity":4}]'::jsonb)
    ON CONFLICT (user_id, date) DO UPDATE SET zones = EXCLUDED.zones, updated_at = now();
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION demo_soreness_maps() FROM PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.demo_state') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_demo_soreness ON demo_state';
    EXECUTE 'CREATE TRIGGER trg_demo_soreness
               AFTER UPDATE ON demo_state
               FOR EACH ROW EXECUTE FUNCTION demo_soreness_maps()';
    UPDATE demo_state SET last_reset = last_reset WHERE id = 1;
  END IF;
END $$;

COMMIT;

-- Проверка 1: таблица есть, RLS включён → одна строка, rowsecurity = true.
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'soreness_maps';

-- Проверка 2: проверка формата работает → true, false, false.
SELECT public.valid_soreness_zones('[{"zone_id":"quadriceps","side":"both","severity":4}]'),
       public.valid_soreness_zones('[{"zone_id":"knee","side":"left","severity":4}]'),
       public.valid_soreness_zones('[{"zone_id":"lower_back","side":"left","severity":2}]');
