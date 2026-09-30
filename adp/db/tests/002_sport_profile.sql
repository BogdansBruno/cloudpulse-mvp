-- =============================================================================
-- ADP — tests for 002_sport_profile.sql (sport, team season phase, soreness map)
-- =============================================================================
-- Same harness as 001_rls_matrix.sql; everything is rolled back at the end.
--   psql -d adp_test -f adp/db/tests/000_supabase_stub.sql
--   psql -d adp_test -f adp/db/migrations/001_init_adp_schema.sql
--   psql -d adp_test -f adp/db/migrations/002_sport_profile.sql
--   psql -d adp_test -f adp/db/tests/002_sport_profile.sql
-- Last line of output must be: ALL ADP SPORT PROFILE TESTS PASSED
-- =============================================================================

\set ON_ERROR_STOP 1
\set QUIET 1
-- Only the NOTICE lines (ok / FAIL) and the final line are printed.
\o /dev/null
BEGIN;

-- ---------------------------------------------------------------------------
-- Test helpers (live in a throwaway schema, rolled back with everything else)
-- ---------------------------------------------------------------------------

CREATE SCHEMA adp_test;
GRANT USAGE ON SCHEMA adp_test TO PUBLIC;

CREATE TABLE adp_test.people (label text PRIMARY KEY, id uuid NOT NULL, role adp.user_role NOT NULL);
GRANT SELECT ON adp_test.people TO PUBLIC;
INSERT INTO adp_test.people VALUES
  ('S1',  'a1000000-0000-4000-8000-000000000001', 'student'),
  ('S2',  'a1000000-0000-4000-8000-000000000002', 'student'),
  ('P1',  'a1000000-0000-4000-8000-000000000011', 'parent'),
  ('C1',  'a1000000-0000-4000-8000-000000000021', 'coach'),
  ('C2',  'a1000000-0000-4000-8000-000000000022', 'coach'),
  ('T1',  'a1000000-0000-4000-8000-000000000031', 'teacher'),
  ('T2',  'a1000000-0000-4000-8000-000000000032', 'teacher'),
  ('D1',  'a1000000-0000-4000-8000-000000000041', 'doctor'),
  ('D2',  'a1000000-0000-4000-8000-000000000042', 'doctor'),
  ('SC',  'a1000000-0000-4000-8000-000000000051', 'scout'),
  ('NEW', 'a1000000-0000-4000-8000-000000000099', 'student');

CREATE FUNCTION adp_test.uid(p text) RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT id FROM adp_test.people WHERE label = p $$;

-- Acts as a signed-in user: same JWT claim + role Supabase would set.
CREATE FUNCTION adp_test.login(p text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', adp_test.uid(p)::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

-- Back to the test superuser with no user claim (seeding / time travel).
CREATE FUNCTION adp_test.logout() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  EXECUTE 'RESET ROLE';
END;
$$;

-- Acts as the server (service_role: no user, bypasses RLS).
CREATE FUNCTION adp_test.as_server() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  EXECUTE 'SET LOCAL ROLE service_role';
END;
$$;

CREATE FUNCTION adp_test.expect(label text, actual anyelement, expected anyelement) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FAIL %: expected %, got %', label, expected, actual;
  END IF;
  RAISE NOTICE 'ok   %', label;
END;
$$;

-- Runs a statement that MUST fail with an error matching `pattern`.
CREATE FUNCTION adp_test.expect_error(label text, stmt text, pattern text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~* pattern THEN
      RAISE NOTICE 'ok   % (refused: %)', label, SQLERRM;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL %: wrong error: %', label, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL %: statement succeeded but must be refused', label;
END;
$$;

-- Runs a statement and returns how many rows it touched (RLS filters
-- UPDATE/DELETE silently: "0 rows" is how a denied UPDATE looks).
CREATE FUNCTION adp_test.touched(stmt text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  EXECUTE stmt;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA adp_test TO PUBLIC;

-- ---------------------------------------------------------------------------
-- Seed (superuser)
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) SELECT id, lower(label) || '@adp.test' FROM adp_test.people;
INSERT INTO adp.profiles (id, role, display_name)
  SELECT id, role, label FROM adp_test.people WHERE label <> 'NEW';
INSERT INTO adp.team_memberships (coach_id, student_id) VALUES
  (adp_test.uid('C1'), adp_test.uid('S1')),
  (adp_test.uid('C2'), adp_test.uid('S1')),
  (adp_test.uid('C2'), adp_test.uid('S2'));
INSERT INTO adp.guardianships (parent_id, student_id) VALUES (adp_test.uid('P1'), adp_test.uid('S1'));
INSERT INTO adp.doctor_access (doctor_id, student_id, expires_at)
  VALUES (adp_test.uid('D1'), adp_test.uid('S1'), now() + interval '7 days');

-- ---------------------------------------------------------------------------
-- 1. Sport: the student's own, students only
-- ---------------------------------------------------------------------------

SELECT adp_test.login('S1');
SELECT adp_test.expect('student sets own sport',
  adp_test.touched($$UPDATE adp.profiles SET sport_type = 'football' WHERE id = adp_test.uid('S1')$$), 1::bigint);
SELECT adp_test.logout();
SELECT adp_test.login('C1');
SELECT adp_test.expect('coach cannot set a student''s sport',
  adp_test.touched($$UPDATE adp.profiles SET sport_type = 'swimming' WHERE id = adp_test.uid('S1')$$), 0::bigint);
SELECT adp_test.expect('coach sees the team''s sport', (SELECT sport_type::text FROM adp.profiles WHERE id = adp_test.uid('S1')), 'football');
SELECT adp_test.logout();
SELECT adp_test.expect_error('sport only for students (even the server)',
  $$UPDATE adp.profiles SET sport_type = 'tennis' WHERE id = adp_test.uid('P1')$$, 'profiles_sport_only_students');
SELECT adp_test.expect_error('unknown sport refused',
  $$UPDATE adp.profiles SET sport_type = 'chess' WHERE id = adp_test.uid('S1')$$, 'invalid input value');

-- ---------------------------------------------------------------------------
-- 2. Season phase: set by the coach for the whole team
-- ---------------------------------------------------------------------------

SELECT adp_test.login('C1');
INSERT INTO adp.coach_seasons (coach_id, season_phase) VALUES (adp_test.uid('C1'), 'off_season');
SELECT adp_test.expect('coach sets own team phase', (SELECT season_phase::text FROM adp.coach_seasons), 'off_season');
SELECT adp_test.expect_error('coach cannot set another coach''s phase',
  $$INSERT INTO adp.coach_seasons (coach_id, season_phase) VALUES (adp_test.uid('C2'), 'in_season')$$, 'row-level security');
SELECT adp_test.expect_error('phase time cannot be back-dated by the client (no column privilege)',
  $$UPDATE adp.coach_seasons SET phase_updated_at = now() - interval '1 year'$$, 'permission denied');
SELECT adp_test.expect_error('coach cannot move the row to another coach',
  $$UPDATE adp.coach_seasons SET coach_id = adp_test.uid('C2')$$, 'permission denied');
SELECT adp_test.logout();

SELECT adp_test.login('S1');
SELECT adp_test.expect_error('student cannot set a phase',
  $$INSERT INTO adp.coach_seasons (coach_id, season_phase) VALUES (adp_test.uid('S1'), 'in_season')$$, 'ROLE_MISMATCH|row-level security');
SELECT adp_test.expect('student cannot change the coach''s phase',
  adp_test.touched($$UPDATE adp.coach_seasons SET season_phase = 'recovery'$$), 0::bigint);
SELECT adp_test.expect('student sees own coach''s phase', (SELECT count(*) FROM adp.coach_seasons), 1::bigint);
SELECT adp_test.expect('phase applies to the student', (SELECT season_phase::text FROM adp.season_phase_of(adp_test.uid('S1'))), 'off_season');
SELECT adp_test.logout();

SELECT adp_test.login('S2');
SELECT adp_test.expect('other team''s student sees nothing', (SELECT count(*) FROM adp.coach_seasons), 0::bigint);
SELECT adp_test.expect('no phase for S2 yet', (SELECT count(*) FROM adp.season_phase_of(adp_test.uid('S2'))), 0::bigint);
SELECT adp_test.logout();

SELECT adp_test.login('P1');
SELECT adp_test.expect('parent does not see team phases', (SELECT count(*) FROM adp.coach_seasons), 0::bigint);
SELECT adp_test.logout();

-- Two coaches: the most recent phase wins.
UPDATE adp.coach_seasons SET season_phase = 'off_season';  -- restamp as superuser, then age it
ALTER TABLE adp.coach_seasons DISABLE TRIGGER coach_seasons_guard;
UPDATE adp.coach_seasons SET phase_updated_at = now() - interval '2 days';
ALTER TABLE adp.coach_seasons ENABLE TRIGGER coach_seasons_guard;
SELECT adp_test.login('C2');
INSERT INTO adp.coach_seasons (coach_id, season_phase) VALUES (adp_test.uid('C2'), 'pre_season');
SELECT adp_test.logout();
SELECT adp_test.as_server();
SELECT adp_test.expect('several coaches: latest phase wins', (SELECT season_phase::text FROM adp.season_phase_of(adp_test.uid('S1'))), 'pre_season');
SELECT adp_test.expect('... and says who set it', (SELECT set_by FROM adp.season_phase_of(adp_test.uid('S1'))), adp_test.uid('C2'));
SELECT adp_test.logout();
SELECT adp_test.expect_error('a parent cannot own a season row, even via the server',
  $$INSERT INTO adp.coach_seasons (coach_id, season_phase) VALUES (adp_test.uid('P1'), 'in_season')$$, 'ROLE_MISMATCH');

-- ---------------------------------------------------------------------------
-- 3. Soreness map in the check-in (server writes, student + doctor read)
-- ---------------------------------------------------------------------------

SELECT adp_test.as_server();
INSERT INTO adp.check_ins (student_id, check_in_date, sleep_quality, stress, fatigue, soreness, soreness_zones)
VALUES (adp_test.uid('S1'), current_date, 5, 5, 3, 3,
        '[{"zone_id": "quadriceps", "side": "both", "severity": 4}, {"zone_id": "lower_back", "side": "center", "severity": 2}]');
SELECT adp_test.expect('server stores a valid soreness map', (SELECT jsonb_array_length(soreness_zones) FROM adp.check_ins), 2);
SELECT adp_test.logout();

SELECT adp_test.expect('empty map is the default',
  adp.valid_soreness_zones('[]'::jsonb), true);
SELECT adp_test.expect('joint is not a zone', adp.valid_soreness_zones('[{"zone_id": "knee", "side": "left", "severity": 3}]'), false);
SELECT adp_test.expect('paired zone needs a side', adp.valid_soreness_zones('[{"zone_id": "calves", "side": "center", "severity": 3}]'), false);
SELECT adp_test.expect('central zone is "center" only', adp.valid_soreness_zones('[{"zone_id": "lower_back", "side": "left", "severity": 3}]'), false);
SELECT adp_test.expect('severity 6 refused', adp.valid_soreness_zones('[{"zone_id": "glutes", "side": "right", "severity": 6}]'), false);
SELECT adp_test.expect('severity 2.5 refused', adp.valid_soreness_zones('[{"zone_id": "glutes", "side": "right", "severity": 2.5}]'), false);
SELECT adp_test.expect('severity as text refused', adp.valid_soreness_zones('[{"zone_id": "glutes", "side": "right", "severity": "3"}]'), false);
SELECT adp_test.expect('duplicate zone+side refused', adp.valid_soreness_zones('[{"zone_id": "calves", "side": "left", "severity": 2}, {"zone_id": "calves", "side": "left", "severity": 3}]'), false);
SELECT adp_test.expect('same zone, other side is fine', adp.valid_soreness_zones('[{"zone_id": "calves", "side": "left", "severity": 2}, {"zone_id": "calves", "side": "right", "severity": 3}]'), true);
SELECT adp_test.expect('extra keys refused (no free text smuggled in)', adp.valid_soreness_zones('[{"zone_id": "calves", "side": "left", "severity": 2, "note": "hurts a lot"}]'), false);
SELECT adp_test.expect('more than 6 zones refused', adp.valid_soreness_zones('[
  {"zone_id": "calves", "side": "both", "severity": 1}, {"zone_id": "quadriceps", "side": "both", "severity": 1},
  {"zone_id": "hamstrings", "side": "both", "severity": 1}, {"zone_id": "glutes", "side": "both", "severity": 1},
  {"zone_id": "adductors", "side": "both", "severity": 1}, {"zone_id": "hip_flexors", "side": "both", "severity": 1},
  {"zone_id": "shins", "side": "both", "severity": 1}]'), false);
SELECT adp_test.expect('not an array refused', adp.valid_soreness_zones('{"zone_id": "calves"}'), false);
SELECT adp_test.expect_error('table refuses a bad map, even from the server',
  $$INSERT INTO adp.check_ins (student_id, check_in_date, sleep_quality, stress, fatigue, soreness, soreness_zones)
    VALUES (adp_test.uid('S2'), current_date, 5, 5, 5, 5, '[{"zone_id": "knee", "side": "left", "severity": 3}]')$$,
  'check_ins_soreness_zones_valid');

SELECT adp_test.login('S1');
SELECT adp_test.expect('student sees own soreness map', (SELECT soreness_zones -> 0 ->> 'zone_id' FROM adp.check_ins), 'quadriceps');
SELECT adp_test.expect_error('student cannot write the check-in directly',
  $$UPDATE adp.check_ins SET soreness_zones = '[]'$$, 'permission denied');
SELECT adp_test.logout();
SELECT adp_test.login('D1');
SELECT adp_test.expect('chosen doctor sees the map', (SELECT count(*) FROM adp.check_ins), 1::bigint);
SELECT adp_test.logout();
SELECT adp_test.login('C1');
SELECT adp_test.expect('coach does not see the map', (SELECT count(*) FROM adp.check_ins), 0::bigint);
SELECT adp_test.logout();
SELECT adp_test.login('P1');
SELECT adp_test.expect('parent does not see the map', (SELECT count(*) FROM adp.check_ins), 0::bigint);
SELECT adp_test.logout();

\echo ALL ADP SPORT PROFILE TESTS PASSED
ROLLBACK;
