-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
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
