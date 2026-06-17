create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'landing',
  user_agent text,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

drop policy if exists "Service role can manage waitlist" on public.waitlist;
create policy "Service role can manage waitlist"
  on public.waitlist
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
