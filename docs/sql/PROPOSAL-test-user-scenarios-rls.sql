-- INVESTLAB TEST design proposal only. DO NOT execute against any Supabase project.
-- User-owned scenario documents; real holdings, cash, cost basis and ledger rows are excluded.
begin;
create table if not exists public.test_user_scenarios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  schema_version integer not null default 1 check (schema_version = 1),
  scenario_steps jsonb not null default '[]'::jsonb
    check (jsonb_typeof(scenario_steps) = 'array' and jsonb_array_length(scenario_steps) <= 100),
  assumptions jsonb not null default '{}'::jsonb check (jsonb_typeof(assumptions) = 'object'),
  source_ledger_revision text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_user_scenarios_owner_name_unique unique(owner_id,name),
  constraint test_user_scenarios_no_ledger_snapshot
    check (not (assumptions ?| array['positions','holdings','cash','cashBalance','averageCost','transactions','ledgerEntries']))
);
create index if not exists test_user_scenarios_owner_updated_idx on public.test_user_scenarios(owner_id,updated_at desc);
alter table public.test_user_scenarios enable row level security;
alter table public.test_user_scenarios force row level security;
revoke all on public.test_user_scenarios from public,anon;
grant select,insert,update,delete on public.test_user_scenarios to authenticated;
create policy test_user_scenarios_select_own on public.test_user_scenarios
 for select to authenticated using (owner_id = (select auth.uid()));
create policy test_user_scenarios_insert_own on public.test_user_scenarios
 for insert to authenticated with check (owner_id = (select auth.uid()));
create policy test_user_scenarios_update_own on public.test_user_scenarios
 for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy test_user_scenarios_delete_own on public.test_user_scenarios
 for delete to authenticated using (owner_id = (select auth.uid()));
commit;
-- NOT YET VERIFIED: actual RLS isolation, privileges, rollback, schema compatibility.
-- DB-level validation of nested steps/assumptions requires a further validated constraint or RPC.
