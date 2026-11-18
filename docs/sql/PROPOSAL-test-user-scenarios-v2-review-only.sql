-- INVESTLAB TEST REVIEW-ONLY DRAFT v2. DO NOT EXECUTE.
-- No SQL from this file has been applied to Supabase.
-- This is an additive design alternative, not an approved migration.
-- Important: deployment must include an atomic authenticated write RPC for revision and quota.
begin;
create function public.test_scenario_payload_valid(steps jsonb, assumptions jsonb)
returns boolean language sql immutable set search_path = ''
as $fn$
 select
  jsonb_typeof(steps) = 'array'
  and jsonb_array_length(steps) <= 100
  and coalesce((
    select bool_and(
      jsonb_typeof(s.value) = 'object'
      and (s.value - 'type' - 'ticker' - 'quantity' - 'price' - 'fee') = '{}'::jsonb
      and s.value->>'type' in ('BUY','SELL')
      and (s.value->>'ticker') ~ '^[A-Z0-9.^_-]{1,20}$'
      and jsonb_typeof(s.value->'quantity') = 'number'
      and (s.value->>'quantity')::numeric > 0
      and jsonb_typeof(s.value->'price') = 'number'
      and (s.value->>'price')::numeric > 0
      and (not s.value ? 'fee' or
           (jsonb_typeof(s.value->'fee') = 'number' and (s.value->>'fee')::numeric >= 0))
    ) from jsonb_array_elements(steps) s(value)
  ),true)
  and jsonb_typeof(assumptions) = 'object'
  and (assumptions - 'targetCash' - 'terminalPrices') = '{}'::jsonb
  and (not assumptions ? 'targetCash' or
       (jsonb_typeof(assumptions->'targetCash') = 'number'
        and (assumptions->>'targetCash')::numeric >= 0))
  and (not assumptions ? 'terminalPrices' or
       (jsonb_typeof(assumptions->'terminalPrices') = 'object'
        and jsonb_object_length(assumptions->'terminalPrices') <= 300
        and coalesce((
          select bool_and(k.key ~ '^[A-Z0-9.^_-]{1,20}$'
            and jsonb_typeof(k.value) = 'number'
            and (k.value#>>'{}')::numeric >= 0)
          from jsonb_each(assumptions->'terminalPrices') k(key,value)
        ),true)))
$fn$;
create table public.test_user_scenarios (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 80 and name=btrim(name)),
 schema_version integer not null default 1 check (schema_version=1),
 revision bigint not null default 1 check (revision >= 1),
 scenario_steps jsonb not null default '[]'::jsonb,
 assumptions jsonb not null default '{}'::jsonb,
 source_ledger_revision text check (source_ledger_revision is null or char_length(source_ledger_revision)<=128),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint test_scenario_payload_shape check (public.test_scenario_payload_valid(scenario_steps,assumptions)),
 constraint test_scenario_size check (octet_length(scenario_steps::text)+octet_length(assumptions::text)<=65536),
 constraint test_scenario_owner_name_unique unique(owner_id,name)
);
create index test_user_scenarios_owner_updated_idx
 on public.test_user_scenarios(owner_id,updated_at desc);
alter table public.test_user_scenarios enable row level security;
alter table public.test_user_scenarios force row level security;
revoke all on public.test_user_scenarios from public,anon,authenticated;
grant select on public.test_user_scenarios to authenticated;
create policy test_user_scenarios_select_own on public.test_user_scenarios
 for select to authenticated using (owner_id=(select auth.uid()));
-- No INSERT/UPDATE/DELETE policy or grant: writes intentionally disabled until
-- authenticated atomic RPC, owner quota, concurrency and two-user RLS tests are ready.
commit;
-- REVIEW REQUIRED before execution: validate function casts, grants, ownership,
-- Postgres/Supabase version compatibility, error paths, rollback and RPC design.
