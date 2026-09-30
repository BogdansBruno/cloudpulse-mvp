-- =============================================================================
-- ADP — 002: sport profile, team season phase, soreness map
-- (Sport-Aware AI Coach & Rehab Engine, step 1; types: src/types/sportProfile.ts)
-- =============================================================================
--
-- Decisions (team, 30.09.2026):
--   1. The season phase is set by the COACH, once for the whole team. A
--      coach's team = their rows in team_memberships, so the phase lives in
--      adp.coach_seasons (one row per coach). Students cannot change it.
--      If a student has several coaches, the most recently set phase wins
--      (adp.season_phase_of).
--   2. The soreness map is part of the check-in: adp.check_ins.soreness_zones.
--      It is seen exactly like the other check-in answers — by the student and
--      a doctor the student chose — and written only by the server.
--
-- The athlete's own sport is a typed column on adp.profiles (students only).
--
-- Every list here must match src/types/sportProfile.ts one to one (the TS
-- file is the source; a parity check compares them).
--
-- Local run, after 001:
--   psql -d adp_test -f adp/db/migrations/002_sport_profile.sql
--   psql -d adp_test -f adp/db/tests/002_sport_profile.sql
-- =============================================================================

BEGIN;

CREATE TYPE adp.sport_type AS ENUM ('football', 'basketball', 'swimming', 'tennis', 'athletics', 'other');
CREATE TYPE adp.season_phase AS ENUM ('pre_season', 'in_season', 'off_season', 'recovery');

-- -----------------------------------------------------------------------------
-- 1. The athlete's own sport
-- -----------------------------------------------------------------------------

ALTER TABLE adp.profiles ADD COLUMN sport_type adp.sport_type;
ALTER TABLE adp.profiles
  ADD CONSTRAINT profiles_sport_only_students CHECK (sport_type IS NULL OR role = 'student');

GRANT INSERT (sport_type), UPDATE (sport_type) ON adp.profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Season phase: one per coach = one per team
-- -----------------------------------------------------------------------------

CREATE TABLE adp.coach_seasons (
  coach_id         uuid PRIMARY KEY REFERENCES adp.profiles (id) ON DELETE CASCADE,
  season_phase     adp.season_phase NOT NULL,
  -- Stamped by the database on every write; a client cannot back-date it.
  phase_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION adp.guard_coach_season() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM adp.assert_role(NEW.coach_id, 'coach', 'coach_id');
  IF TG_OP = 'UPDATE' AND NEW.coach_id IS DISTINCT FROM OLD.coach_id THEN
    RAISE EXCEPTION 'COACH_IMMUTABLE';
  END IF;
  NEW.phase_updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER coach_seasons_guard BEFORE INSERT OR UPDATE ON adp.coach_seasons
  FOR EACH ROW EXECUTE FUNCTION adp.guard_coach_season();

ALTER TABLE adp.coach_seasons ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON adp.coach_seasons FROM PUBLIC, anon, authenticated;
GRANT ALL ON adp.coach_seasons TO service_role;
GRANT SELECT ON adp.coach_seasons TO authenticated;
GRANT INSERT (coach_id, season_phase), UPDATE (season_phase) ON adp.coach_seasons TO authenticated;

-- The coach manages their own row only (and must really be a coach: the
-- trigger checks the role, whoever writes).
CREATE POLICY coach_seasons_coach_select ON adp.coach_seasons FOR SELECT TO authenticated
  USING (coach_id = (SELECT auth.uid()));
CREATE POLICY coach_seasons_coach_insert ON adp.coach_seasons FOR INSERT TO authenticated
  WITH CHECK (coach_id = (SELECT auth.uid()));
CREATE POLICY coach_seasons_coach_update ON adp.coach_seasons FOR UPDATE TO authenticated
  USING (coach_id = (SELECT auth.uid())) WITH CHECK (coach_id = (SELECT auth.uid()));
-- A student sees the phase of their own coaches (is_linked_to_me covers the
-- team link; coach_seasons rows only ever belong to coaches).
CREATE POLICY coach_seasons_student_select ON adp.coach_seasons FOR SELECT TO authenticated
  USING (adp.is_linked_to_me(coach_id));

-- The phase that applies to a student: the most recently set one among their
-- coaches. SECURITY INVOKER — RLS decides what the caller can see; the
-- server (service_role) sees every coach and gets the full answer.
CREATE FUNCTION adp.season_phase_of(p_student uuid)
RETURNS TABLE (season_phase adp.season_phase, set_by uuid, phase_updated_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT cs.season_phase, cs.coach_id, cs.phase_updated_at
    FROM adp.coach_seasons cs
    JOIN adp.team_memberships tm ON tm.coach_id = cs.coach_id
   WHERE tm.student_id = p_student
   ORDER BY cs.phase_updated_at DESC, cs.coach_id
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION adp.season_phase_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adp.season_phase_of(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Soreness map in the check-in
-- -----------------------------------------------------------------------------
-- [{"zone_id": "quadriceps", "side": "both", "severity": 4}, ...]
--   - zone_id: muscle regions only (no joints — joint pain goes to triage);
--   - side: paired zones left/right/both, central zones "center";
--   - severity: whole number 1..5; at most 6 zones; no zone+side twice;
--     no other keys.

CREATE FUNCTION adp.valid_soreness_zones(z jsonb) RETURNS boolean
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

REVOKE EXECUTE ON FUNCTION adp.valid_soreness_zones(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adp.valid_soreness_zones(jsonb) TO authenticated, service_role;

ALTER TABLE adp.check_ins
  ADD COLUMN soreness_zones jsonb NOT NULL DEFAULT '[]'::jsonb
  CONSTRAINT check_ins_soreness_zones_valid CHECK (adp.valid_soreness_zones(soreness_zones));

-- No new grants on check_ins: clients still cannot write it (server only),
-- and the existing SELECT policies (student + chosen doctor) cover the new
-- column. Coaches and parents keep seeing only daily_status.

COMMIT;
