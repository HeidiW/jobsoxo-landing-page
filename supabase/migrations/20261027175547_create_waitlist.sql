-- Waitlist signups from the landing page. Written to by /api/waitlist with the service-role key.
-- First applied by hand in the SQL editor; every statement is idempotent, so re-running it is safe.
create table if not exists public.waitlist (
  id         bigint generated always as identity primary key,
  name       text,
  email      text not null unique,
  trade      text,
  crew       text,
  source     text not null default 'landing',
  created_at timestamptz not null default now()
);

-- Emails are lowercased by the API; this guards against anything inserted by hand.
create unique index if not exists waitlist_email_lower_idx on public.waitlist (lower(email));

-- Lock the table down. The site writes with the service-role key, which bypasses RLS;
-- the public anon key gets no access at all.
alter table public.waitlist enable row level security;
