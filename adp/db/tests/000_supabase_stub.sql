-- =============================================================================
-- Minimal stand-in for Supabase on a plain local PostgreSQL (16+), so the ADP
-- migration and its RLS tests run without a Supabase project.
--
-- NEVER run this on a real Supabase database: there these roles, the auth
-- schema and auth.uid() already exist (and are managed by Supabase).
--
-- What it recreates:
--   - roles anon, authenticated, service_role (service_role bypasses RLS,
--     like on Supabase);
--   - auth.users (id + email only);
--   - auth.uid(), reading the user id from the request's JWT claims the same
--     way Supabase does (request.jwt.claim.sub or request.jwt.claims->>'sub').
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  id    uuid PRIMARY KEY,
  email text UNIQUE
);
GRANT SELECT ON auth.users TO service_role;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
