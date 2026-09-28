-- =============================================================================
-- ADP — access-matrix tests for 001_init_adp_schema.sql
-- =============================================================================
--
-- Logs in as each role and checks, table by table, what it can see and do
-- against the PRD v0.1 matrix. Everything runs in one transaction that is
-- ROLLED BACK at the end, so the database is left exactly as it was.
--
-- Local run (plain PostgreSQL 16, no Supabase):
--   createdb adp_test
--   psql -d adp_test -f adp/db/tests/000_supabase_stub.sql
--   psql -d adp_test -f adp/db/migrations/001_init_adp_schema.sql
--   psql -d adp_test -f adp/db/tests/001_rls_matrix.sql
-- Last line of output must be: ALL ADP RLS TESTS PASSED
--
-- A failed check stops the script with "FAIL <name>: ...".
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
-- Seed (as superuser: owner, no RLS, triggers see no user = "server")
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) SELECT id, lower(label) || '@adp.test' FROM adp_test.people;

INSERT INTO adp.profiles (id, role, display_name)
SELECT id, role, label FROM adp_test.people WHERE label <> 'NEW';

INSERT INTO adp.team_memberships (coach_id, student_id) VALUES
  (adp_test.uid('C1'), adp_test.uid('S1')),
  (adp_test.uid('C2'), adp_test.uid('S2'));
INSERT INTO adp.guardianships (parent_id, student_id) VALUES (adp_test.uid('P1'), adp_test.uid('S1'));
INSERT INTO adp.teacher_assignments (teacher_id, student_id) VALUES
  (adp_test.uid('T1'), adp_test.uid('S1')),
  (adp_test.uid('T2'), adp_test.uid('S2'));
INSERT INTO adp.doctor_access (doctor_id, student_id, expires_at)
VALUES (adp_test.uid('D1'), adp_test.uid('S1'), now() + interval '7 days');

INSERT INTO adp.check_ins (student_id, check_in_date, sleep_quality, stress, fatigue, soreness, pain_reported, pain_location)
VALUES (adp_test.uid('S1'), current_date, 6, 5, 5, 3, true, 'knee'),
       (adp_test.uid('S2'), current_date, 6, 6, 6, 6, false, NULL);

INSERT INTO adp.daily_status (student_id, status_date, color, load_blocked, reason_codes) VALUES
  (adp_test.uid('S1'), current_date, 'red', true, '{PAIN_REPORTED}'),
  (adp_test.uid('S2'), current_date, 'green', false, '{}');

INSERT INTO adp.safety_flags (student_id, flag_level, red_flag_type, source, location)
VALUES (adp_test.uid('S1'), 'red', 'pain', 'check_in', 'knee');

INSERT INTO adp.academic_records (student_id, subject, original_grade, scale_type, assessed_on, source) VALUES
  (adp_test.uid('S1'), 'Matemātika', 6, 'lv10', current_date - 10, 'school'),
  (adp_test.uid('S1'), 'Fizika',     5, 'lv10', current_date - 5,  'school'),
  (adp_test.uid('S2'), 'Matemātika', 8, 'lv10', current_date - 3,  'school');

INSERT INTO adp.eligibility_statuses (student_id, status_color, reason_code) VALUES
  (adp_test.uid('S1'), 'yellow', 'NEAR_THRESHOLD'),
  (adp_test.uid('S2'), 'green',  'OK');

INSERT INTO adp.reschedule_requests (student_id, teacher_id, subject, event_date, reason, proposed_dates)
VALUES (adp_test.uid('S1'), adp_test.uid('T1'), 'Matemātika', current_date + 5, 'competition',
        ARRAY[current_date + 7, current_date + 8]);

-- ---------------------------------------------------------------------------
-- Schema-level invariants (as superuser)
-- ---------------------------------------------------------------------------

SELECT adp_test.expect('grade lv10 1 -> 0',      adp.normalize_grade('lv10', 1),   0.0000::numeric);
SELECT adp_test.expect('grade lv10 4 -> 0.40',   adp.normalize_grade('lv10', 4),   0.4000::numeric);
SELECT adp_test.expect('grade lv10 5 -> 0.50',   adp.normalize_grade('lv10', 5),   0.5000::numeric);
SELECT adp_test.expect('grade lv10 9 -> 0.90',   adp.normalize_grade('lv10', 9),   0.9000::numeric);
SELECT adp_test.expect('grade lv10 10 -> 1',     adp.normalize_grade('lv10', 10),  1.0000::numeric);
SELECT adp_test.expect('grade ib7 5 -> 0.6667',  adp.normalize_grade('ib7', 5),    0.6667::numeric);
SELECT adp_test.expect('grade gpa4 3.5 -> 0.875', adp.normalize_grade('gpa4', 3.5), 0.8750::numeric);
SELECT adp_test.expect_error('grade 11 on lv10 refused', $$SELECT adp.normalize_grade('lv10', 11)$$, 'GRADE_OUT_OF_SCALE');
SELECT adp_test.expect_error('grade 3.5 on ib7 refused (off step)', $$SELECT adp.normalize_grade('ib7', 3.5)$$, 'GRADE_OUT_OF_SCALE');
SELECT adp_test.expect_error('bad anchors refused',
  $$UPDATE adp.grade_scales SET anchors = '[[1, 0.5], [10, 0.2]]' WHERE scale_type = 'lv10'$$, 'BAD_ANCHORS');
SELECT adp_test.expect_error('link with wrong roles refused',
  $$INSERT INTO adp.team_memberships (coach_id, student_id) VALUES (adp_test.uid('S2'), adp_test.uid('S1'))$$, 'ROLE_MISMATCH');
SELECT adp_test.expect_error('NO_DATA cannot carry a colour',
  $$INSERT INTO adp.eligibility_statuses (student_id, status_color, reason_code) VALUES (adp_test.uid('P1'), 'green', 'NO_DATA')$$, 'check constraint');
SELECT adp_test.expect_error('blocked day cannot be green',
  $$INSERT INTO adp.daily_status (student_id, status_date, color, load_blocked) VALUES (adp_test.uid('S2'), current_date - 1, 'green', true)$$, 'check constraint');
SELECT adp_test.expect_error('pain cannot be a yellow flag',
  $$INSERT INTO adp.safety_flags (student_id, flag_level, red_flag_type, source) VALUES (adp_test.uid('S2'), 'yellow', 'pain', 'check_in')$$, 'check constraint');
SELECT adp_test.expect_error('doctor grant longer than 14 days refused',
  $$INSERT INTO adp.doctor_access (doctor_id, student_id, expires_at) VALUES (adp_test.uid('D2'), adp_test.uid('S1'), now() + interval '30 days')$$, 'check constraint');
SELECT adp_test.expect('worse eligibility is hidden from the coach for 48 h',
  (SELECT coach_visible_from > now() + interval '47 hours' FROM adp.eligibility_statuses WHERE student_id = adp_test.uid('S1')), true);
SELECT adp_test.expect('green eligibility reaches the coach at once',
  (SELECT coach_visible_from <= now() FROM adp.eligibility_statuses WHERE student_id = adp_test.uid('S2')), true);

-- ---------------------------------------------------------------------------
-- Student S1
-- ---------------------------------------------------------------------------

SELECT adp_test.login('S1');
SELECT adp_test.expect('S1 sees own check-in only',        (SELECT count(*) FROM adp.check_ins), 1::bigint);
SELECT adp_test.expect('S1 sees own daily status only',    (SELECT count(*) FROM adp.daily_status), 1::bigint);
SELECT adp_test.expect('S1 sees own flag',                 (SELECT count(*) FROM adp.safety_flags), 1::bigint);
SELECT adp_test.expect('S1 sees own grades only',          (SELECT count(*) FROM adp.academic_records), 2::bigint);
SELECT adp_test.expect('S1 sees own eligibility only',     (SELECT count(*) FROM adp.eligibility_statuses), 1::bigint);
SELECT adp_test.expect('S1 sees own reschedule request',   (SELECT count(*) FROM adp.reschedule_requests), 1::bigint);
SELECT adp_test.expect('S1 sees self + coach, parent, teacher, doctor',
  (SELECT count(*) FROM adp.profiles), 5::bigint);
SELECT adp_test.expect('S1 cannot see S2 at all',
  (SELECT count(*) FROM adp.profiles WHERE id = adp_test.uid('S2')), 0::bigint);

SELECT adp_test.expect_error('S1 cannot write a check-in directly (server only)',
  $$INSERT INTO adp.check_ins (student_id, check_in_date, sleep_quality, stress, fatigue, soreness) VALUES (adp_test.uid('S1'), current_date - 1, 7, 7, 7, 7)$$,
  'permission denied');
SELECT adp_test.expect_error('S1 cannot paint own day green',
  $$UPDATE adp.daily_status SET color = 'green', load_blocked = false$$, 'permission denied');
SELECT adp_test.expect_error('S1 cannot change own eligibility',
  $$UPDATE adp.eligibility_statuses SET status_color = 'green', reason_code = 'OK'$$, 'permission denied');
SELECT adp_test.expect('S1 cannot clear own flag (no policy: 0 rows)',
  adp_test.touched($$UPDATE adp.safety_flags SET cleared_by_doctor = true$$), 0::bigint);
SELECT adp_test.expect_error('S1 cannot promote self to coach',
  $$UPDATE adp.profiles SET role = 'coach' WHERE id = adp_test.uid('S1')$$, 'permission denied');

-- Self-reported grades: allowed, normalised by the database, labelled 'student'.
INSERT INTO adp.academic_records (student_id, subject, original_grade, scale_type, assessed_on)
VALUES (adp_test.uid('S1'), 'Ķīmija', 7, 'lv10', current_date);
SELECT adp_test.expect('self-reported grade normalised by DB (7 -> 0.70)',
  (SELECT normalized_score FROM adp.academic_records WHERE subject = 'Ķīmija'), 0.7000::numeric);
SELECT adp_test.expect('self-reported grade labelled as student source',
  (SELECT source::text FROM adp.academic_records WHERE subject = 'Ķīmija'), 'student');
SELECT adp_test.expect_error('S1 cannot set normalized_score',
  $$INSERT INTO adp.academic_records (student_id, subject, original_grade, scale_type, assessed_on, normalized_score) VALUES (adp_test.uid('S1'), 'X', 5, 'lv10', current_date, 1)$$,
  'permission denied');
SELECT adp_test.expect_error('S1 cannot claim a grade is school-verified',
  $$INSERT INTO adp.academic_records (student_id, subject, original_grade, scale_type, assessed_on, source) VALUES (adp_test.uid('S1'), 'X', 5, 'lv10', current_date, 'school')$$,
  'permission denied');
SELECT adp_test.expect_error('S1 cannot enter an impossible grade',
  $$INSERT INTO adp.academic_records (student_id, subject, original_grade, scale_type, assessed_on) VALUES (adp_test.uid('S1'), 'X', 11, 'lv10', current_date)$$,
  'GRADE_OUT_OF_SCALE');
SELECT adp_test.expect_error('S1 cannot add grades for S2',
  $$INSERT INTO adp.academic_records (student_id, subject, original_grade, scale_type, assessed_on) VALUES (adp_test.uid('S2'), 'X', 5, 'lv10', current_date)$$,
  'row-level security');
SELECT adp_test.expect('S1 cannot edit school-verified grades',
  adp_test.touched($$UPDATE adp.academic_records SET original_grade = 10 WHERE source = 'school'$$), 0::bigint);
SELECT adp_test.expect('S1 can fix own self-reported grade',
  adp_test.touched($$UPDATE adp.academic_records SET original_grade = 8 WHERE subject = 'Ķīmija'$$), 1::bigint);
SELECT adp_test.expect('fixed grade re-normalised (8 -> 0.80)',
  (SELECT normalized_score FROM adp.academic_records WHERE subject = 'Ķīmija'), 0.8000::numeric);

-- Reschedule: student asks, cannot decide.
INSERT INTO adp.reschedule_requests (student_id, teacher_id, subject, event_date, reason, proposed_dates)
VALUES (adp_test.uid('S1'), adp_test.uid('T1'), 'Fizika', current_date + 3, 'travel', ARRAY[current_date + 6]);
SELECT adp_test.expect_error('S1 cannot address a teacher who does not teach them',
  $$INSERT INTO adp.reschedule_requests (student_id, teacher_id, subject, event_date, reason, proposed_dates) VALUES (adp_test.uid('S1'), adp_test.uid('T2'), 'Vēsture', current_date + 3, 'travel', ARRAY[current_date + 6])$$,
  'NOT_THIS_STUDENTS_TEACHER');
SELECT adp_test.expect_error('medical reason travels without details',
  $$INSERT INTO adp.reschedule_requests (student_id, teacher_id, subject, event_date, reason, reason_note, proposed_dates) VALUES (adp_test.uid('S1'), adp_test.uid('T1'), 'Bioloģija', current_date + 3, 'medical', 'concussion', ARRAY[current_date + 9])$$,
  'check constraint');
SELECT adp_test.expect('S1 cannot approve own request',
  adp_test.touched($$UPDATE adp.reschedule_requests SET status = 'approved'$$), 0::bigint);

-- Doctor access: grant, then revoke.
INSERT INTO adp.doctor_access (doctor_id, student_id, expires_at)
VALUES (adp_test.uid('D2'), adp_test.uid('S1'), now() + interval '3 days');
SELECT adp_test.expect('S1 can revoke a doctor grant',
  adp_test.touched($$UPDATE adp.doctor_access SET revoked_at = now() WHERE doctor_id = adp_test.uid('D2')$$), 1::bigint);
SELECT adp_test.expect_error('a revoked grant cannot be re-opened',
  $$UPDATE adp.doctor_access SET revoked_at = NULL WHERE doctor_id = adp_test.uid('D2')$$, 'GRANT_ALREADY_REVOKED');
SELECT adp_test.expect_error('S1 cannot extend a grant',
  $$UPDATE adp.doctor_access SET expires_at = now() + interval '13 days' WHERE doctor_id = adp_test.uid('D1')$$, 'permission denied');
SELECT adp_test.logout();

-- ---------------------------------------------------------------------------
-- Parent P1 (child = S1): colour of the day, flags, eligibility. Nothing else.
-- ---------------------------------------------------------------------------

SELECT adp_test.login('P1');
SELECT adp_test.expect('P1 sees child daily colour',   (SELECT count(*) FROM adp.daily_status), 1::bigint);
SELECT adp_test.expect('P1 sees child red flags',      (SELECT count(*) FROM adp.safety_flags), 1::bigint);
SELECT adp_test.expect('P1 sees child eligibility at once', (SELECT count(*) FROM adp.eligibility_statuses), 1::bigint);
SELECT adp_test.expect('P1 does NOT see check-in answers', (SELECT count(*) FROM adp.check_ins), 0::bigint);
SELECT adp_test.expect('P1 does NOT see grades',       (SELECT count(*) FROM adp.academic_records), 0::bigint);
SELECT adp_test.expect('P1 does NOT see reschedules',  (SELECT count(*) FROM adp.reschedule_requests), 0::bigint);
SELECT adp_test.expect('P1 sees self + child',         (SELECT count(*) FROM adp.profiles), 2::bigint);
SELECT adp_test.expect('P1 does not see other children',
  (SELECT count(*) FROM adp.daily_status WHERE student_id = adp_test.uid('S2')), 0::bigint);
SELECT adp_test.logout();

-- ---------------------------------------------------------------------------
-- Coach C1 (team = S1): readiness, flags, eligibility colour (after notice).
-- ---------------------------------------------------------------------------

SELECT adp_test.login('C1');
SELECT adp_test.expect('C1 sees team daily status',    (SELECT count(*) FROM adp.daily_status), 1::bigint);
SELECT adp_test.expect('C1 sees team flags',           (SELECT count(*) FROM adp.safety_flags), 1::bigint);
SELECT adp_test.expect('C1 does not yet see the worse eligibility (48 h)', (SELECT count(*) FROM adp.eligibility_statuses), 0::bigint);
SELECT adp_test.expect('C1 does NOT see grades',       (SELECT count(*) FROM adp.academic_records), 0::bigint);
SELECT adp_test.expect('C1 does NOT see answers',      (SELECT count(*) FROM adp.check_ins), 0::bigint);
SELECT adp_test.expect('C1 does NOT see reschedules',  (SELECT count(*) FROM adp.reschedule_requests), 0::bigint);
SELECT adp_test.expect('C1 sees self + team',          (SELECT count(*) FROM adp.profiles), 2::bigint);

INSERT INTO adp.safety_flags (student_id, flag_level, red_flag_type, location)
VALUES (adp_test.uid('S1'), 'red', 'cannot_bear_weight', 'left ankle');
SELECT adp_test.expect('coach report is attributed to the coach',
  (SELECT reported_by = adp_test.uid('C1') AND source = 'coach_report'
     FROM adp.safety_flags WHERE red_flag_type = 'cannot_bear_weight'), true);
SELECT adp_test.expect_error('C1 cannot report on another team',
  $$INSERT INTO adp.safety_flags (student_id, flag_level, red_flag_type) VALUES (adp_test.uid('S2'), 'red', 'pain')$$,
  'row-level security');
SELECT adp_test.expect('C1 cannot clear a flag',
  adp_test.touched($$UPDATE adp.safety_flags SET cleared_by_doctor = true$$), 0::bigint);
SELECT adp_test.logout();

-- 48 h later (simulated): the coach now gets the colour.
UPDATE adp.eligibility_statuses SET coach_visible_from = now() - interval '1 minute'
WHERE student_id = adp_test.uid('S1');
SELECT adp_test.login('C1');
SELECT adp_test.expect('C1 sees eligibility after the notice window', (SELECT count(*) FROM adp.eligibility_statuses), 1::bigint);
SELECT adp_test.logout();

SELECT adp_test.login('C2');
SELECT adp_test.expect('C2 sees nothing of S1',
  (SELECT count(*) FROM adp.daily_status WHERE student_id = adp_test.uid('S1'))
  + (SELECT count(*) FROM adp.safety_flags WHERE student_id = adp_test.uid('S1')), 0::bigint);
SELECT adp_test.expect('C2 sees own team (S2)',        (SELECT count(*) FROM adp.daily_status), 1::bigint);
SELECT adp_test.logout();

-- ---------------------------------------------------------------------------
-- Teacher T1 (teaches S1): requests addressed to them. No health data.
-- ---------------------------------------------------------------------------

SELECT adp_test.login('T1');
SELECT adp_test.expect('T1 sees requests addressed to them', (SELECT count(*) FROM adp.reschedule_requests), 2::bigint);
SELECT adp_test.expect('T1 does NOT see daily status',  (SELECT count(*) FROM adp.daily_status), 0::bigint);
SELECT adp_test.expect('T1 does NOT see flags',         (SELECT count(*) FROM adp.safety_flags), 0::bigint);
SELECT adp_test.expect('T1 does NOT see answers',       (SELECT count(*) FROM adp.check_ins), 0::bigint);
SELECT adp_test.expect('T1 does NOT see eligibility',   (SELECT count(*) FROM adp.eligibility_statuses), 0::bigint);
SELECT adp_test.expect('T1 does not see grades others entered', (SELECT count(*) FROM adp.academic_records), 0::bigint);
SELECT adp_test.expect('T1 sees self + own students',   (SELECT count(*) FROM adp.profiles), 2::bigint);

SELECT adp_test.expect_error('approval needs one of the proposed dates',
  $$UPDATE adp.reschedule_requests SET status = 'approved' WHERE subject = 'Matemātika'$$, 'check constraint');
SELECT adp_test.expect_error('approval cannot pick a date the student did not propose',
  $$UPDATE adp.reschedule_requests SET status = 'approved', approved_date = current_date + 30 WHERE subject = 'Matemātika'$$, 'check constraint');
SELECT adp_test.expect('T1 approves in one tap (on a proposed date)',
  adp_test.touched($$UPDATE adp.reschedule_requests SET status = 'approved', approved_date = current_date + 8 WHERE subject = 'Matemātika'$$), 1::bigint);
SELECT adp_test.expect('decision is stamped with the teacher',
  (SELECT decided_by = adp_test.uid('T1') AND decided_at IS NOT NULL
     FROM adp.reschedule_requests WHERE subject = 'Matemātika'), true);
SELECT adp_test.expect('a decision is final',
  adp_test.touched($$UPDATE adp.reschedule_requests SET status = 'rejected' WHERE subject = 'Matemātika'$$), 0::bigint);
SELECT adp_test.expect_error('T1 cannot move the date themselves',
  $$UPDATE adp.reschedule_requests SET event_date = current_date + 20 WHERE subject = 'Fizika'$$, 'permission denied');
SELECT adp_test.expect_error('T1 cannot set the request back to pending',
  $$UPDATE adp.reschedule_requests SET status = 'pending' WHERE subject = 'Fizika'$$, 'DECISION_REQUIRED');

INSERT INTO adp.academic_records (student_id, subject, original_grade, scale_type, assessed_on)
VALUES (adp_test.uid('S1'), 'Latviešu valoda', 9, 'lv10', current_date);
SELECT adp_test.expect('teacher grade is labelled school-verified',
  (SELECT source::text FROM adp.academic_records WHERE subject = 'Latviešu valoda'), 'school');
SELECT adp_test.expect('T1 sees the grade they entered', (SELECT count(*) FROM adp.academic_records), 1::bigint);
SELECT adp_test.expect_error('T1 cannot grade a student they do not teach',
  $$INSERT INTO adp.academic_records (student_id, subject, original_grade, scale_type, assessed_on) VALUES (adp_test.uid('S2'), 'X', 5, 'lv10', current_date)$$,
  'row-level security');
SELECT adp_test.logout();

SELECT adp_test.login('T2');
SELECT adp_test.expect('T2 sees no requests for S1', (SELECT count(*) FROM adp.reschedule_requests), 0::bigint);
SELECT adp_test.logout();

-- ---------------------------------------------------------------------------
-- Doctor D1 (active grant for S1) and D2 (grant revoked)
-- ---------------------------------------------------------------------------

SELECT adp_test.login('D1');
SELECT adp_test.expect('D1 sees the shared check-in', (SELECT count(*) FROM adp.check_ins), 1::bigint);
SELECT adp_test.expect('D1 sees both open flags',     (SELECT count(*) FROM adp.safety_flags), 2::bigint);
SELECT adp_test.expect('D1 does NOT see grades',      (SELECT count(*) FROM adp.academic_records), 0::bigint);
SELECT adp_test.expect('D1 can clear the pain flag',
  adp_test.touched($$UPDATE adp.safety_flags SET cleared_by_doctor = true, clearance_note = 'examined' WHERE red_flag_type = 'pain'$$), 1::bigint);
SELECT adp_test.expect('clearance is stamped with the doctor',
  (SELECT cleared_by = adp_test.uid('D1') AND cleared_at IS NOT NULL
     FROM adp.safety_flags WHERE red_flag_type = 'pain'), true);
SELECT adp_test.expect('a clearance cannot be undone',
  adp_test.touched($$UPDATE adp.safety_flags SET cleared_by_doctor = false WHERE red_flag_type = 'pain'$$), 0::bigint);
SELECT adp_test.logout();

SELECT adp_test.login('D2');
SELECT adp_test.expect('D2 sees nothing after the grant was revoked',
  (SELECT count(*) FROM adp.safety_flags) + (SELECT count(*) FROM adp.check_ins), 0::bigint);
SELECT adp_test.expect('D2 cannot clear anything',
  adp_test.touched($$UPDATE adp.safety_flags SET cleared_by_doctor = true$$), 0::bigint);
SELECT adp_test.logout();

-- Expired grant: D1 loses access when the 14-day window closes.
UPDATE adp.doctor_access SET granted_at = now() - interval '10 days', expires_at = now() - interval '1 minute'
WHERE doctor_id = adp_test.uid('D1');
SELECT adp_test.login('D1');
SELECT adp_test.expect('D1 sees nothing after the grant expired', (SELECT count(*) FROM adp.check_ins), 0::bigint);
SELECT adp_test.logout();

-- ---------------------------------------------------------------------------
-- Scout: no consent model yet, so nothing at all.
-- ---------------------------------------------------------------------------

SELECT adp_test.login('SC');
SELECT adp_test.expect('scout sees no student data',
    (SELECT count(*) FROM adp.check_ins) + (SELECT count(*) FROM adp.daily_status)
  + (SELECT count(*) FROM adp.safety_flags) + (SELECT count(*) FROM adp.academic_records)
  + (SELECT count(*) FROM adp.eligibility_statuses) + (SELECT count(*) FROM adp.reschedule_requests), 0::bigint);
SELECT adp_test.expect('scout sees only own profile', (SELECT count(*) FROM adp.profiles), 1::bigint);
SELECT adp_test.logout();

-- ---------------------------------------------------------------------------
-- Sign-up: nobody can make themselves a verified role.
-- ---------------------------------------------------------------------------

SELECT adp_test.login('NEW');
SELECT adp_test.expect_error('new user cannot sign up as coach',
  $$INSERT INTO adp.profiles (id, role, display_name) VALUES (adp_test.uid('NEW'), 'coach', 'Fake coach')$$,
  'row-level security');
SELECT adp_test.expect_error('new user cannot sign up as doctor',
  $$INSERT INTO adp.profiles (id, role, display_name) VALUES (adp_test.uid('NEW'), 'doctor', 'Fake doctor')$$,
  'row-level security');
SELECT adp_test.expect_error('new user cannot create someone else''s profile',
  $$INSERT INTO adp.profiles (id, role, display_name) VALUES (adp_test.uid('S2'), 'student', 'Impostor')$$,
  'row-level security|duplicate key');
INSERT INTO adp.profiles (id, role, display_name) VALUES (adp_test.uid('NEW'), 'student', 'New Student');
SELECT adp_test.expect('new user can sign up as student', (SELECT count(*) FROM adp.profiles), 1::bigint);
SELECT adp_test.logout();

-- ---------------------------------------------------------------------------
-- Server (service_role): writes what clients cannot, still bound by triggers.
-- ---------------------------------------------------------------------------

SELECT adp_test.as_server();
SELECT adp_test.expect('server sees everything (RLS bypass)', (SELECT count(*) FROM adp.check_ins), 2::bigint);
SELECT adp_test.expect_error('even the server cannot create a request for a non-assigned teacher',
  $$INSERT INTO adp.reschedule_requests (student_id, teacher_id, subject, event_date, reason, proposed_dates) VALUES (adp_test.uid('S2'), adp_test.uid('T1'), 'X', current_date + 2, 'competition', ARRAY[current_date + 4])$$,
  'NOT_THIS_STUDENTS_TEACHER');
SELECT adp_test.expect_error('a decided request stays decided, even for the server',
  $$UPDATE adp.reschedule_requests SET status = 'rejected' WHERE subject = 'Matemātika'$$, 'DECISION_FINAL');
SELECT adp_test.logout();

\echo ALL ADP RLS TESTS PASSED
ROLLBACK;
