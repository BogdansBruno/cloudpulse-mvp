-- =============================================================================
-- ADP (Athlete Digital Passport) — 001: schema, tables, Row Level Security
-- =============================================================================
--
-- Run ONCE, as a superuser / the Supabase `postgres` role. Not re-runnable:
-- CREATE TYPE has no IF NOT EXISTS. Everything lives in its own schema `adp`
-- so nothing here touches the live CloudPulse tables (public.profiles etc.).
--
-- DO NOT run this on the production Supabase before the competition
-- (06.11.2026). Test it on a local Postgres with
-- adp/db/tests/000_supabase_stub.sql + adp/db/tests/001_rls_matrix.sql.
--
-- Access matrix (PRD v0.1). "Sees" = SELECT allowed by RLS. Anything not
-- listed is denied, because RLS denies by default.
--
--   table                 student  parent   coach        teacher      doctor*   scout
--   profiles              own+links child    team         assigned     access    own
--   check_ins (answers)   own      -        -            -            access    -
--   daily_status (color)  own      child    team         -            access    -
--   safety_flags          own      child    team (+add)  -            access    -
--                                                                     (+clear)
--   eligibility_statuses  own      child    team**       -            -         -
--   academic_records      own(+add) -       -            own entries  -         -
--   reschedule_requests   own(+add) -       -            addressed    -         -
--                                                        (+decide)
--   * doctor: only while the student's access grant is active (≤ 14 days).
--   ** coach: a worsening status reaches the coach 48 h after the student
--      (PRD 3.3 — the student hears it first).
--   Scouts see nothing yet: the scout layer (phase 3) needs its own consent
--   model before a single policy is written for it.
--
-- Who writes what:
--   - Check-ins, daily status, check-in safety flags, eligibility: ONLY the
--     server (service_role) after the TypeScript engines ran
--     (TriageSafetyGuard, AcademicEngine). Clients cannot write them, so they
--     cannot fake a green status or hide a red flag.
--   - Relationship links (team, guardian, teacher): ONLY the server, after the
--     signed consent form. No client can attach themselves to a child.
--   - A student may grant a doctor access to their data; the doctor clears
--     flags; nobody else can clear a flag (no diagnosis, MDR — PRD 3.1).
--   - The machine proposes a reschedule, the teacher decides (PRD 3.4).
--
-- Performance: policies call auth.uid() as (SELECT auth.uid()) so Postgres
-- evaluates it once per statement, not once per row (Supabase guidance).
-- =============================================================================

BEGIN;

CREATE SCHEMA adp;
REVOKE ALL ON SCHEMA adp FROM PUBLIC;
GRANT USAGE ON SCHEMA adp TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------

CREATE TYPE adp.user_role AS ENUM ('student', 'parent', 'teacher', 'coach', 'doctor', 'scout');
CREATE TYPE adp.status_color AS ENUM ('green', 'yellow', 'red');
CREATE TYPE adp.scale_type AS ENUM ('lv10', 'ib7', 'gpa4');
CREATE TYPE adp.record_source AS ENUM ('student', 'school');
CREATE TYPE adp.reschedule_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE adp.reschedule_reason AS ENUM ('competition', 'travel', 'medical');
CREATE TYPE adp.flag_level AS ENUM ('red', 'yellow');
CREATE TYPE adp.flag_source AS ENUM ('check_in', 'coach_report');

-- Observed signs, NOT diagnoses. Each value is something an athlete or coach
-- can see or feel ("I can't put weight on my foot"), never a conclusion
-- ("sprain"). Deciding what it means is the doctor's job (PRD 3.1, EU MDR).
CREATE TYPE adp.red_flag_type AS ENUM (
  'pain',
  'head_impact',
  'loss_of_consciousness',
  'seizure',
  'confusion',
  'cannot_bear_weight',
  'visible_deformity',
  'numbness_or_tingling',
  'chest_pain_or_breathlessness',
  'overuse_pattern'
);

-- -----------------------------------------------------------------------------
-- Shared trigger helpers
-- -----------------------------------------------------------------------------

CREATE FUNCTION adp.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. profiles
-- -----------------------------------------------------------------------------
-- One row per account, keyed by the Supabase auth user. `metadata` is for
-- non-sensitive profile facts linked adults may see (sport, class, position).
-- Never put health or grades in it.

CREATE TABLE adp.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role         adp.user_role NOT NULL,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 60),
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_touch BEFORE UPDATE ON adp.profiles
  FOR EACH ROW EXECUTE FUNCTION adp.touch_updated_at();

-- Role of the calling user, NULL for service_role / anonymous. SECURITY
-- DEFINER so policies can read it without recursing into profiles' own RLS.
CREATE FUNCTION adp.my_role() RETURNS adp.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.role FROM adp.profiles p WHERE p.id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 2. Relationship links (server-managed; created after signed consent)
-- -----------------------------------------------------------------------------

-- Refuses a link whose people have the wrong roles, whoever inserts it —
-- even service_role. A typo in an admin script cannot turn a scout into a
-- "coach" of a child.
CREATE FUNCTION adp.assert_role(p_user uuid, p_role adp.user_role, p_label text) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM adp.profiles p WHERE p.id = p_user AND p.role = p_role) THEN
    RAISE EXCEPTION 'ROLE_MISMATCH: % must be a %', p_label, p_role;
  END IF;
END;
$$;

CREATE TABLE adp.team_memberships (
  coach_id   uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coach_id, student_id)
);

CREATE TABLE adp.guardianships (
  parent_id  uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);

CREATE TABLE adp.teacher_assignments (
  teacher_id uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, student_id)
);

-- A student shares their data with one doctor for at most 14 days (PRD 4:
-- "access 14 days"). Revoking is one tap and cannot be undone by the doctor.
CREATE TABLE adp.doctor_access (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > granted_at AND expires_at <= granted_at + interval '14 days'),
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);
CREATE INDEX doctor_access_lookup ON adp.doctor_access (doctor_id, student_id);

CREATE FUNCTION adp.check_link_roles() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'team_memberships' THEN
      PERFORM adp.assert_role(NEW.coach_id, 'coach', 'coach_id');
    WHEN 'guardianships' THEN
      PERFORM adp.assert_role(NEW.parent_id, 'parent', 'parent_id');
    WHEN 'teacher_assignments' THEN
      PERFORM adp.assert_role(NEW.teacher_id, 'teacher', 'teacher_id');
    WHEN 'doctor_access' THEN
      PERFORM adp.assert_role(NEW.doctor_id, 'doctor', 'doctor_id');
  END CASE;
  PERFORM adp.assert_role(NEW.student_id, 'student', 'student_id');
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_memberships_roles BEFORE INSERT OR UPDATE ON adp.team_memberships
  FOR EACH ROW EXECUTE FUNCTION adp.check_link_roles();
CREATE TRIGGER guardianships_roles BEFORE INSERT OR UPDATE ON adp.guardianships
  FOR EACH ROW EXECUTE FUNCTION adp.check_link_roles();
CREATE TRIGGER teacher_assignments_roles BEFORE INSERT OR UPDATE ON adp.teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION adp.check_link_roles();
CREATE TRIGGER doctor_access_roles BEFORE INSERT OR UPDATE ON adp.doctor_access
  FOR EACH ROW EXECUTE FUNCTION adp.check_link_roles();

-- A grant can only ever be revoked (NULL -> now), never re-opened, moved to
-- another doctor or extended. The student makes a new grant instead.
CREATE FUNCTION adp.guard_doctor_access() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service_role (admin tooling)
  END IF;
  IF NEW.doctor_id <> OLD.doctor_id OR NEW.student_id <> OLD.student_id
     OR NEW.granted_at <> OLD.granted_at OR NEW.expires_at <> OLD.expires_at THEN
    RAISE EXCEPTION 'GRANT_IMMUTABLE: only revoking is allowed';
  END IF;
  IF OLD.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'GRANT_ALREADY_REVOKED';
  END IF;
  IF NEW.revoked_at IS NOT NULL THEN
    NEW.revoked_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER doctor_access_guard BEFORE UPDATE ON adp.doctor_access
  FOR EACH ROW EXECUTE FUNCTION adp.guard_doctor_access();

-- Relationship checks used by the policies. SECURITY DEFINER so they read the
-- link tables without tripping those tables' own RLS (and without recursion).
CREATE FUNCTION adp.is_coach_of(p_student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM adp.team_memberships t
                  WHERE t.coach_id = auth.uid() AND t.student_id = p_student);
$$;

CREATE FUNCTION adp.is_parent_of(p_student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM adp.guardianships g
                  WHERE g.parent_id = auth.uid() AND g.student_id = p_student);
$$;

CREATE FUNCTION adp.is_teacher_of(p_student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM adp.teacher_assignments a
                  WHERE a.teacher_id = auth.uid() AND a.student_id = p_student);
$$;

-- Does p_teacher teach p_student? Used when a student addresses a request.
CREATE FUNCTION adp.teaches(p_teacher uuid, p_student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM adp.teacher_assignments a
                  WHERE a.teacher_id = p_teacher AND a.student_id = p_student);
$$;

CREATE FUNCTION adp.doctor_can_see(p_student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM adp.doctor_access d
                  WHERE d.doctor_id = auth.uid() AND d.student_id = p_student
                    AND d.revoked_at IS NULL AND d.expires_at > now());
$$;

-- Is p_other linked to the caller in any direction? Lets a student see the
-- names of the adults who can see them — transparency, PRD 4.
CREATE FUNCTION adp.is_linked_to_me(p_other uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM adp.team_memberships t    WHERE t.student_id = auth.uid() AND t.coach_id   = p_other)
      OR EXISTS (SELECT 1 FROM adp.guardianships g       WHERE g.student_id = auth.uid() AND g.parent_id  = p_other)
      OR EXISTS (SELECT 1 FROM adp.teacher_assignments a WHERE a.student_id = auth.uid() AND a.teacher_id = p_other)
      OR EXISTS (SELECT 1 FROM adp.doctor_access d       WHERE d.student_id = auth.uid() AND d.doctor_id  = p_other);
$$;

-- -----------------------------------------------------------------------------
-- 3. Grade scales + academic_records
-- -----------------------------------------------------------------------------
-- Scale → common "attainment level" a ∈ [0, 1] by piecewise-linear anchors
-- (PRD 3.2). The anchors are a school-approved config, not an official
-- conversion; `approved_by` records who signed it. The seed rows are the PRD
-- examples and are marked as awaiting approval.

CREATE TABLE adp.grade_scales (
  scale_type adp.scale_type PRIMARY KEY,
  min_grade  numeric(4,2) NOT NULL,
  max_grade  numeric(4,2) NOT NULL,
  step       numeric(4,2) NOT NULL CHECK (step > 0),
  pass_grade numeric(4,2) NOT NULL,
  anchors    jsonb NOT NULL,            -- [[grade, level], ...], grades strictly increasing
  version    integer NOT NULL DEFAULT 1,
  approved_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (min_grade < max_grade),
  CHECK (pass_grade BETWEEN min_grade AND max_grade)
);

CREATE FUNCTION adp.check_grade_scale() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  n int := jsonb_array_length(NEW.anchors);
  i int;
  g numeric; a numeric; prev_g numeric; prev_a numeric;
BEGIN
  IF jsonb_typeof(NEW.anchors) <> 'array' OR n < 2 THEN
    RAISE EXCEPTION 'BAD_ANCHORS: need at least two [grade, level] pairs';
  END IF;
  FOR i IN 0 .. n - 1 LOOP
    g := (NEW.anchors -> i ->> 0)::numeric;
    a := (NEW.anchors -> i ->> 1)::numeric;
    IF g IS NULL OR a IS NULL OR a < 0 OR a > 1 THEN
      RAISE EXCEPTION 'BAD_ANCHORS: pair % is not [grade, level 0..1]', i;
    END IF;
    IF i > 0 AND (g <= prev_g OR a < prev_a) THEN
      RAISE EXCEPTION 'BAD_ANCHORS: grades must increase and levels must not decrease';
    END IF;
    prev_g := g; prev_a := a;
  END LOOP;
  IF (NEW.anchors -> 0 ->> 0)::numeric <> NEW.min_grade
     OR (NEW.anchors -> (n - 1) ->> 0)::numeric <> NEW.max_grade THEN
    RAISE EXCEPTION 'BAD_ANCHORS: first/last anchor must sit on min/max grade';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER grade_scales_check BEFORE INSERT OR UPDATE ON adp.grade_scales
  FOR EACH ROW EXECUTE FUNCTION adp.check_grade_scale();

INSERT INTO adp.grade_scales (scale_type, min_grade, max_grade, step, pass_grade, anchors, approved_by) VALUES
  ('lv10', 1, 10, 1,    4, '[[1, 0], [4, 0.40], [7, 0.70], [10, 1]]', 'PRD v0.1 example - awaiting school approval'),
  ('ib7',  1, 7,  1,    4, '[[1, 0], [4, 0.50], [7, 1]]',             'PRD v0.1 example - awaiting school approval'),
  ('gpa4', 0, 4,  0.01, 2, '[[0, 0], [2, 0.50], [4, 1]]',             'PRD v0.1 example - awaiting school approval');

-- Grade → level. Refuses grades outside the scale or off its step (a 7.5 on
-- the Latvian 10-point scale does not exist). Mirrors
-- adp/src/services/AcademicEngine.ts `normalizeGrade`; a test checks parity.
CREATE FUNCTION adp.normalize_grade(p_scale adp.scale_type, p_grade numeric) RETURNS numeric
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  s adp.grade_scales%ROWTYPE;
  n int; i int;
  g0 numeric; a0 numeric; g1 numeric; a1 numeric;
BEGIN
  SELECT * INTO s FROM adp.grade_scales WHERE scale_type = p_scale;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNKNOWN_SCALE: %', p_scale;
  END IF;
  IF p_grade IS NULL OR p_grade < s.min_grade OR p_grade > s.max_grade
     OR mod(p_grade - s.min_grade, s.step) <> 0 THEN
    RAISE EXCEPTION 'GRADE_OUT_OF_SCALE: % is not a valid % grade', p_grade, p_scale;
  END IF;
  n := jsonb_array_length(s.anchors);
  FOR i IN 0 .. n - 2 LOOP
    g0 := (s.anchors -> i ->> 0)::numeric;     a0 := (s.anchors -> i ->> 1)::numeric;
    g1 := (s.anchors -> (i + 1) ->> 0)::numeric; a1 := (s.anchors -> (i + 1) ->> 1)::numeric;
    IF p_grade <= g1 THEN
      RETURN round(a0 + (a1 - a0) * (p_grade - g0) / (g1 - g0), 4);
    END IF;
  END LOOP;
  RETURN round((s.anchors -> (n - 1) ->> 1)::numeric, 4);
END;
$$;

CREATE TABLE adp.academic_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  subject          text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 80),
  original_grade   numeric(4,2) NOT NULL,
  scale_type       adp.scale_type NOT NULL,
  normalized_score numeric(5,4) NOT NULL CHECK (normalized_score BETWEEN 0 AND 1),
  weight           numeric(4,2) NOT NULL DEFAULT 1 CHECK (weight > 0 AND weight <= 10),
  assessed_on      date NOT NULL,
  source           adp.record_source NOT NULL,
  created_by       uuid REFERENCES adp.profiles (id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academic_records_student ON adp.academic_records (student_id, assessed_on);

-- Clients never choose normalized_score, source or created_by (they have no
-- column privilege for them). The trigger derives them:
--   teacher → 'school' (verified), student → 'student' (self-reported,
--   labelled as such everywhere; PRD risk 1), service_role → as given.
CREATE FUNCTION adp.prepare_academic_record() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  caller_role adp.user_role := adp.my_role();
BEGIN
  NEW.normalized_score := adp.normalize_grade(NEW.scale_type, NEW.original_grade);
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := auth.uid();
      NEW.source := CASE WHEN caller_role = 'teacher' THEN 'school'::adp.record_source
                         ELSE 'student'::adp.record_source END;
    ELSIF NEW.source IS NULL THEN
      RAISE EXCEPTION 'SOURCE_REQUIRED: server imports must set source';
    END IF;
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.source := OLD.source;
    NEW.student_id := OLD.student_id;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER academic_records_prepare BEFORE INSERT OR UPDATE ON adp.academic_records
  FOR EACH ROW EXECUTE FUNCTION adp.prepare_academic_record();

-- -----------------------------------------------------------------------------
-- 4. eligibility_statuses (server-written, one current row per student)
-- -----------------------------------------------------------------------------
-- Only a colour and a reason code: no averages or grades, so the coach can
-- see this row without seeing academic detail (PRD 3.3). NO_DATA has no
-- colour at all — never an invented green.

CREATE TABLE adp.eligibility_statuses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL UNIQUE REFERENCES adp.profiles (id) ON DELETE CASCADE,
  status_color       adp.status_color,
  reason_code        text NOT NULL CHECK (reason_code IN
                       ('OK', 'NEAR_THRESHOLD', 'PROJECTED_BELOW', 'BELOW_THRESHOLD', 'NO_DATA')),
  coach_visible_from timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK ((reason_code = 'NO_DATA') = (status_color IS NULL))
);

-- The student (and parent) hear about a worse status first; the coach 48 h
-- later. Same or better news reaches everyone at once.
CREATE FUNCTION adp.eligibility_rank(c adp.status_color) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE c WHEN 'green' THEN 0 WHEN 'yellow' THEN 1 WHEN 'red' THEN 2 ELSE 0 END;
$$;

CREATE FUNCTION adp.stamp_eligibility() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  worse boolean;
BEGIN
  worse := CASE
    WHEN TG_OP = 'INSERT' THEN adp.eligibility_rank(NEW.status_color) > 0
    ELSE adp.eligibility_rank(NEW.status_color) > adp.eligibility_rank(OLD.status_color)
  END;
  NEW.coach_visible_from := CASE WHEN worse THEN now() + interval '48 hours' ELSE now() END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER eligibility_stamp BEFORE INSERT OR UPDATE OF status_color, reason_code
  ON adp.eligibility_statuses
  FOR EACH ROW EXECUTE FUNCTION adp.stamp_eligibility();

-- -----------------------------------------------------------------------------
-- 5. reschedule_requests
-- -----------------------------------------------------------------------------
-- "The machine counts, a human decides" (PRD 3.4): a request is created by
-- the student or by the server's conflict detector, and ONLY the addressed
-- teacher can approve or reject it. A decision is final.

CREATE TABLE adp.reschedule_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  teacher_id     uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  subject        text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 80),
  event_date     date NOT NULL,                     -- the assessment to move
  reason         adp.reschedule_reason NOT NULL,
  reason_note    text CHECK (reason_note IS NULL OR char_length(reason_note) <= 280),
  proposed_dates date[] NOT NULL CHECK (cardinality(proposed_dates) BETWEEN 1 AND 3),
  status         adp.reschedule_status NOT NULL DEFAULT 'pending',
  -- The teacher approves by tapping one of the proposed dates.
  approved_date  date,
  decided_by     uuid REFERENCES adp.profiles (id) ON DELETE SET NULL,
  decided_at     timestamptz,
  decision_note  text CHECK (decision_note IS NULL OR char_length(decision_note) <= 280),
  created_by     uuid REFERENCES adp.profiles (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- A medical reason travels without details: the teacher is told only that
  -- there is one (PRD 3.4 rule C5, no health data for teachers).
  CHECK (reason <> 'medical' OR reason_note IS NULL),
  CHECK ((status = 'pending') = (decided_at IS NULL)),
  CHECK ((status = 'approved') = (approved_date IS NOT NULL)),
  CHECK (approved_date IS NULL OR approved_date = ANY (proposed_dates)),
  -- One request per assessment. A rejection is final: no re-sending (PRD 3.4).
  UNIQUE (student_id, teacher_id, subject, event_date)
);
CREATE INDEX reschedule_requests_teacher ON adp.reschedule_requests (teacher_id, status);

CREATE FUNCTION adp.guard_reschedule() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT adp.teaches(NEW.teacher_id, NEW.student_id) THEN
      RAISE EXCEPTION 'NOT_THIS_STUDENTS_TEACHER';
    END IF;
    IF NEW.event_date < current_date THEN
      RAISE EXCEPTION 'EVENT_IN_PAST';
    END IF;
    IF NEW.event_date = ANY (NEW.proposed_dates) THEN
      RAISE EXCEPTION 'PROPOSED_DATE_EQUALS_EVENT';
    END IF;
    NEW.status := 'pending';
    NEW.approved_date := NULL;
    NEW.decided_by := NULL;
    NEW.decided_at := NULL;
    NEW.decision_note := NULL;
    NEW.created_by := auth.uid(); -- NULL = created by the server's conflict detector
    RETURN NEW;
  END IF;

  -- UPDATE: only a decision, only once, only by the addressed teacher.
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'DECISION_FINAL';
  END IF;
  IF NEW.status = 'pending' THEN
    RAISE EXCEPTION 'DECISION_REQUIRED';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.teacher_id THEN
    RAISE EXCEPTION 'ONLY_ADDRESSED_TEACHER';
  END IF;
  IF (NEW.student_id, NEW.teacher_id, NEW.subject, NEW.event_date, NEW.reason,
      NEW.reason_note, NEW.proposed_dates, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.student_id, OLD.teacher_id, OLD.subject, OLD.event_date, OLD.reason,
      OLD.reason_note, OLD.proposed_dates, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'REQUEST_IMMUTABLE';
  END IF;
  NEW.decided_by := auth.uid();
  NEW.decided_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reschedule_guard BEFORE INSERT OR UPDATE ON adp.reschedule_requests
  FOR EACH ROW EXECUTE FUNCTION adp.guard_reschedule();

-- -----------------------------------------------------------------------------
-- 6. check_ins + daily_status (server-written)
-- -----------------------------------------------------------------------------
-- The raw answers stay with the student (and a doctor they chose). Parents
-- and coaches get the outcome in daily_status, never the answers (PRD 1).

CREATE TABLE adp.check_ins (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  check_in_date  date NOT NULL,
  sleep_quality  smallint NOT NULL CHECK (sleep_quality BETWEEN 1 AND 7),
  stress         smallint NOT NULL CHECK (stress BETWEEN 1 AND 7),
  fatigue        smallint NOT NULL CHECK (fatigue BETWEEN 1 AND 7),
  soreness       smallint NOT NULL CHECK (soreness BETWEEN 1 AND 7),
  pain_reported  boolean NOT NULL DEFAULT false,
  pain_location  text CHECK (pain_location IS NULL OR char_length(pain_location) <= 60),
  red_flag_signs adp.red_flag_type[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, check_in_date),
  CHECK (pain_reported OR pain_location IS NULL)
);

CREATE TABLE adp.daily_status (
  student_id   uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  status_date  date NOT NULL,
  color        adp.status_color NOT NULL,
  load_blocked boolean NOT NULL,
  reason_codes text[] NOT NULL DEFAULT '{}',
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, status_date),
  -- A blocked day is always red: no "green but you can't train".
  CHECK (NOT load_blocked OR color = 'red')
);

-- -----------------------------------------------------------------------------
-- 7. safety_flags
-- -----------------------------------------------------------------------------
-- Every sign except the overuse pattern is red and blocks load. Only a doctor
-- with an active grant can clear a flag, and a clearance cannot be undone
-- (a new problem is a new flag). PRD 3.1: "only a doctor returns full load".

CREATE TABLE adp.safety_flags (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES adp.profiles (id) ON DELETE CASCADE,
  flag_level        adp.flag_level NOT NULL,
  red_flag_type     adp.red_flag_type NOT NULL,
  source            adp.flag_source NOT NULL,
  reported_by       uuid REFERENCES adp.profiles (id) ON DELETE SET NULL,
  location          text CHECK (location IS NULL OR char_length(location) <= 60),
  cleared_by_doctor boolean NOT NULL DEFAULT false,
  cleared_by        uuid REFERENCES adp.profiles (id) ON DELETE SET NULL,
  cleared_at        timestamptz,
  clearance_note    text CHECK (clearance_note IS NULL OR char_length(clearance_note) <= 280),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK ((red_flag_type = 'overuse_pattern') = (flag_level = 'yellow')),
  CHECK (cleared_by_doctor = (cleared_at IS NOT NULL)),
  CHECK (source <> 'coach_report' OR reported_by IS NOT NULL)
);
CREATE INDEX safety_flags_open ON adp.safety_flags (student_id) WHERE NOT cleared_by_doctor;

CREATE FUNCTION adp.guard_safety_flag() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      -- A client insert is always a coach report, attributed to the caller.
      NEW.source := 'coach_report';
      NEW.reported_by := auth.uid();
    END IF;
    NEW.cleared_by_doctor := false;
    NEW.cleared_by := NULL;
    NEW.cleared_at := NULL;
    NEW.clearance_note := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE: the only change there is, is a doctor's clearance.
  IF OLD.cleared_by_doctor THEN
    RAISE EXCEPTION 'FLAG_ALREADY_CLEARED';
  END IF;
  IF NOT NEW.cleared_by_doctor THEN
    RAISE EXCEPTION 'CLEARANCE_REQUIRED';
  END IF;
  IF auth.uid() IS NOT NULL AND adp.my_role() IS DISTINCT FROM 'doctor' THEN
    RAISE EXCEPTION 'ONLY_DOCTOR_CLEARS';
  END IF;
  IF (NEW.student_id, NEW.flag_level, NEW.red_flag_type, NEW.source, NEW.reported_by,
      NEW.location, NEW.created_at)
     IS DISTINCT FROM
     (OLD.student_id, OLD.flag_level, OLD.red_flag_type, OLD.source, OLD.reported_by,
      OLD.location, OLD.created_at) THEN
    RAISE EXCEPTION 'FLAG_IMMUTABLE';
  END IF;
  NEW.cleared_by := auth.uid();
  NEW.cleared_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER safety_flags_guard BEFORE INSERT OR UPDATE ON adp.safety_flags
  FOR EACH ROW EXECUTE FUNCTION adp.guard_safety_flag();

-- =============================================================================
-- Privileges. Least privilege first, RLS second: a client gets a verb on a
-- table only where some policy below can allow it, and only on the columns it
-- may set. Everything else fails with "permission denied" before RLS runs.
-- =============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA adp FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA adp FROM PUBLIC;

GRANT ALL ON ALL TABLES IN SCHEMA adp TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA adp TO authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA adp TO authenticated;

GRANT INSERT (id, role, display_name, metadata) ON adp.profiles TO authenticated;
GRANT UPDATE (display_name, metadata) ON adp.profiles TO authenticated;

GRANT INSERT (doctor_id, student_id, expires_at) ON adp.doctor_access TO authenticated;
GRANT UPDATE (revoked_at) ON adp.doctor_access TO authenticated;
GRANT DELETE ON adp.team_memberships TO authenticated;

GRANT INSERT (student_id, subject, original_grade, scale_type, weight, assessed_on)
  ON adp.academic_records TO authenticated;
GRANT UPDATE (subject, original_grade, scale_type, weight, assessed_on)
  ON adp.academic_records TO authenticated;
GRANT DELETE ON adp.academic_records TO authenticated;

GRANT INSERT (student_id, teacher_id, subject, event_date, reason, reason_note, proposed_dates)
  ON adp.reschedule_requests TO authenticated;
GRANT UPDATE (status, approved_date, decision_note) ON adp.reschedule_requests TO authenticated;
GRANT DELETE ON adp.reschedule_requests TO authenticated;

GRANT INSERT (student_id, flag_level, red_flag_type, location) ON adp.safety_flags TO authenticated;
GRANT UPDATE (cleared_by_doctor, clearance_note) ON adp.safety_flags TO authenticated;

-- No client INSERT/UPDATE at all on: check_ins, daily_status,
-- eligibility_statuses, grade_scales, guardianships, teacher_assignments,
-- team_memberships (insert). Those are written by the server only.

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE adp.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.team_memberships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.guardianships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.teacher_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.doctor_access        ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.grade_scales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.academic_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.eligibility_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.reschedule_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.check_ins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.daily_status         ENABLE ROW LEVEL SECURITY;
ALTER TABLE adp.safety_flags         ENABLE ROW LEVEL SECURITY;

-- ---- profiles ---------------------------------------------------------------

CREATE POLICY profiles_self_select ON adp.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Anyone can create their OWN profile, but only as student or parent.
-- teacher / coach / doctor / scout are verified roles: the server grants them
-- after checking who the person is. No self-promotion to "doctor".
CREATE POLICY profiles_self_insert ON adp.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()) AND role IN ('student', 'parent'));

-- Own name/metadata only; `role` has no UPDATE privilege at all.
CREATE POLICY profiles_self_update ON adp.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_coach_select_team ON adp.profiles FOR SELECT TO authenticated
  USING (adp.is_coach_of(id));
CREATE POLICY profiles_parent_select_child ON adp.profiles FOR SELECT TO authenticated
  USING (adp.is_parent_of(id));
CREATE POLICY profiles_teacher_select_students ON adp.profiles FOR SELECT TO authenticated
  USING (adp.is_teacher_of(id));
CREATE POLICY profiles_doctor_select_patients ON adp.profiles FOR SELECT TO authenticated
  USING (adp.doctor_can_see(id));
-- A student sees who can see them (their coaches, parents, teachers, doctors).
CREATE POLICY profiles_student_select_linked_adults ON adp.profiles FOR SELECT TO authenticated
  USING (adp.is_linked_to_me(id));

-- ---- relationship links -------------------------------------------------------

CREATE POLICY team_select ON adp.team_memberships FOR SELECT TO authenticated
  USING (coach_id = (SELECT auth.uid()) OR student_id = (SELECT auth.uid()));
-- Either side may end a team link (student leaves / coach removes).
CREATE POLICY team_delete ON adp.team_memberships FOR DELETE TO authenticated
  USING (coach_id = (SELECT auth.uid()) OR student_id = (SELECT auth.uid()));

CREATE POLICY guardianships_select ON adp.guardianships FOR SELECT TO authenticated
  USING (parent_id = (SELECT auth.uid()) OR student_id = (SELECT auth.uid()));

CREATE POLICY teacher_assignments_select ON adp.teacher_assignments FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()) OR student_id = (SELECT auth.uid()));

CREATE POLICY doctor_access_select ON adp.doctor_access FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) OR doctor_id = (SELECT auth.uid()));
CREATE POLICY doctor_access_student_grant ON adp.doctor_access FOR INSERT TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()) AND adp.my_role() = 'student');
CREATE POLICY doctor_access_student_revoke ON adp.doctor_access FOR UPDATE TO authenticated
  USING (student_id = (SELECT auth.uid())) WITH CHECK (student_id = (SELECT auth.uid()));

-- ---- grade_scales: readable config ------------------------------------------

CREATE POLICY grade_scales_read ON adp.grade_scales FOR SELECT TO authenticated USING (true);

-- ---- academic_records ---------------------------------------------------------
-- Coach and parent: NO policy on purpose — they never see grades (PRD 1/3.3).

CREATE POLICY academic_student_select ON adp.academic_records FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));
CREATE POLICY academic_student_insert ON adp.academic_records FOR INSERT TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()) AND adp.my_role() = 'student');
-- A student can fix or delete only their own self-reported entries,
-- never the school's.
CREATE POLICY academic_student_update ON adp.academic_records FOR UPDATE TO authenticated
  USING (student_id = (SELECT auth.uid()) AND source = 'student')
  WITH CHECK (student_id = (SELECT auth.uid()));
CREATE POLICY academic_student_delete ON adp.academic_records FOR DELETE TO authenticated
  USING (student_id = (SELECT auth.uid()) AND source = 'student');

-- Teacher: enters verified grades for assigned students and sees only the
-- entries they made themselves (not the student's whole record).
CREATE POLICY academic_teacher_select ON adp.academic_records FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()) AND adp.is_teacher_of(student_id));
CREATE POLICY academic_teacher_insert ON adp.academic_records FOR INSERT TO authenticated
  WITH CHECK (adp.is_teacher_of(student_id));
CREATE POLICY academic_teacher_update ON adp.academic_records FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) AND adp.is_teacher_of(student_id))
  WITH CHECK (adp.is_teacher_of(student_id));
CREATE POLICY academic_teacher_delete ON adp.academic_records FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) AND adp.is_teacher_of(student_id));

-- ---- eligibility_statuses (read-only for clients) -----------------------------
-- Teacher: no policy (the matrix gives teachers requests only).

CREATE POLICY eligibility_student_select ON adp.eligibility_statuses FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));
CREATE POLICY eligibility_parent_select ON adp.eligibility_statuses FOR SELECT TO authenticated
  USING (adp.is_parent_of(student_id));
-- During the 48 h notice window the coach gets no row for that student
-- ("status updating"), then the new colour.
CREATE POLICY eligibility_coach_select ON adp.eligibility_statuses FOR SELECT TO authenticated
  USING (adp.is_coach_of(student_id) AND coach_visible_from <= now());

-- ---- reschedule_requests --------------------------------------------------------
-- Parent and coach: no policy. Teacher: only requests addressed to them.

CREATE POLICY reschedule_student_select ON adp.reschedule_requests FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));
CREATE POLICY reschedule_student_insert ON adp.reschedule_requests FOR INSERT TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()) AND adp.my_role() = 'student');
-- Withdraw while still pending.
CREATE POLICY reschedule_student_withdraw ON adp.reschedule_requests FOR DELETE TO authenticated
  USING (student_id = (SELECT auth.uid()) AND status = 'pending');

CREATE POLICY reschedule_teacher_select ON adp.reschedule_requests FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()));
-- One-tap decision on a pending request; the trigger makes it final.
CREATE POLICY reschedule_teacher_decide ON adp.reschedule_requests FOR UPDATE TO authenticated
  USING (teacher_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (teacher_id = (SELECT auth.uid()));

-- ---- check_ins (answers: student + chosen doctor only) -------------------------

CREATE POLICY check_ins_student_select ON adp.check_ins FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));
CREATE POLICY check_ins_doctor_select ON adp.check_ins FOR SELECT TO authenticated
  USING (adp.doctor_can_see(student_id));

-- ---- daily_status (colour of the day) ------------------------------------------
-- Teacher: no policy (no health data for teachers).

CREATE POLICY daily_status_student_select ON adp.daily_status FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));
CREATE POLICY daily_status_parent_select ON adp.daily_status FOR SELECT TO authenticated
  USING (adp.is_parent_of(student_id));
CREATE POLICY daily_status_coach_select ON adp.daily_status FOR SELECT TO authenticated
  USING (adp.is_coach_of(student_id));
CREATE POLICY daily_status_doctor_select ON adp.daily_status FOR SELECT TO authenticated
  USING (adp.doctor_can_see(student_id));

-- ---- safety_flags ---------------------------------------------------------------
-- Teacher: no policy.

CREATE POLICY flags_student_select ON adp.safety_flags FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));
CREATE POLICY flags_parent_select ON adp.safety_flags FOR SELECT TO authenticated
  USING (adp.is_parent_of(student_id));
CREATE POLICY flags_coach_select ON adp.safety_flags FOR SELECT TO authenticated
  USING (adp.is_coach_of(student_id));
-- A coach can open a case ("saw them limping", PRD 3.1) but never close one.
CREATE POLICY flags_coach_report ON adp.safety_flags FOR INSERT TO authenticated
  WITH CHECK (adp.is_coach_of(student_id) AND adp.my_role() = 'coach');
CREATE POLICY flags_doctor_select ON adp.safety_flags FOR SELECT TO authenticated
  USING (adp.doctor_can_see(student_id));
CREATE POLICY flags_doctor_clear ON adp.safety_flags FOR UPDATE TO authenticated
  USING (adp.doctor_can_see(student_id) AND NOT cleared_by_doctor)
  WITH CHECK (adp.doctor_can_see(student_id));

COMMIT;
