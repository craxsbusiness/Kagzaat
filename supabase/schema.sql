-- =====================================================================
-- LexVault registry sync table
-- Paste this whole file into: Supabase dashboard → SQL Editor → New query → Run
--
-- The portal keeps four collections in one tiny table, one row each:
--   users · cases · docs · evidence
-- and pushes/subscribes to changes so every signed-in device sees the
-- same case files in real time.
--
-- NOTE: policies below are open for the anon key (demo-grade, matching
-- the portal's client-only architecture). For production, replace them
-- with RLS policies tied to Supabase Auth identities.
-- =====================================================================

create table if not exists public.registry (
  id text primary key,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.registry enable row level security;

drop policy if exists "registry_open_select" on public.registry;
drop policy if exists "registry_open_insert" on public.registry;
drop policy if exists "registry_open_update" on public.registry;

create policy "registry_open_select" on public.registry for select using (true);
create policy "registry_open_insert" on public.registry for insert with check (true);
create policy "registry_open_update" on public.registry for update using (true) with check (true);

-- realtime replication (required for cross-device live updates)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registry'
  ) then
    alter publication supabase_realtime add table public.registry;
  end if;
end $$;
