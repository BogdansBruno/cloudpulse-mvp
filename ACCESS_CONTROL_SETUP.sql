-- CloudPulse: owner kill switch + per-user ban list.
-- Run this ONCE in Supabase Dashboard -> SQL Editor (your project ->
-- left sidebar "SQL Editor" -> New query -> paste -> Run).
--
-- The admin email below MUST exactly match NEXT_PUBLIC_ADMIN_EMAILS in
-- .env.local (local) and in the Vercel project's Environment Variables
-- (production) -- lowercase, no spaces.

create table if not exists app_control (
  id int primary key default 1,
  lockdown boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint app_control_singleton check (id = 1)
);

insert into app_control (id, lockdown)
values (1, false)
on conflict (id) do nothing;

create table if not exists banned_users (
  email text primary key,
  reason text,
  banned_at timestamptz not null default now()
);

alter table app_control enable row level security;
alter table banned_users enable row level security;

-- Anyone (including a logged-out visitor) can READ both tables -- the
-- lockdown/ban check has to run before we necessarily know who someone is.
drop policy if exists "app_control read" on app_control;
create policy "app_control read" on app_control for select using (true);

drop policy if exists "banned_users read" on banned_users;
create policy "banned_users read" on banned_users for select using (true);

-- Only the owner's own logged-in session can WRITE. auth.jwt() reads the
-- CALLING user's own token, so this can't be spoofed from devtools.
drop policy if exists "app_control admin write" on app_control;
create policy "app_control admin write" on app_control
  for update using (auth.jwt() ->> 'email' = 'bogdanshomebox3@gmail.com');

drop policy if exists "banned_users admin write" on banned_users;
create policy "banned_users admin write" on banned_users
  for all using (auth.jwt() ->> 'email' = 'bogdanshomebox3@gmail.com')
  with check (auth.jwt() ->> 'email' = 'bogdanshomebox3@gmail.com');
