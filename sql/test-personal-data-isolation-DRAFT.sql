-- INVESTLAB TEST: personal data isolation draft
-- REVIEW ONLY. DO NOT EXECUTE until TEST project schema, grants and rollback are reviewed.
-- Never run on production. Existing shared market-data tables are untouched.
begin;
create table if not exists public.investlab_personal_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_key text not null,
  ticker text not null,
  quantity numeric(24,8) not null check (quantity >= 0),
  average_cost_usd numeric(24,8) not null check (average_cost_usd >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, account_key, ticker),
  check (length(account_key) between 1 and 100),
  check (ticker ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$')
);
create table if not exists public.investlab_personal_cash (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_key text not null,
  currency text not null check (currency in ('USD','KRW')),
  balance numeric(24,4) not null,
  updated_at timestamptz not null default now(),
  unique (user_id, account_key, currency),
  check (length(account_key) between 1 and 100)
);
create table if not exists public.investlab_personal_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_key text not null,
  trade_at timestamptz not null,
  event_type text not null check (event_type in ('buy','sell','dividend','deposit','withdrawal','fx','fee','adjustment')),
  ticker text,
  quantity numeric(24,8),
  amount numeric(24,4),
  currency text check (currency in ('USD','KRW')),
  exchange_rate numeric(20,6) check (exchange_rate > 0),
  memo text,
  created_at timestamptz not null default now(),
  check (length(account_key) between 1 and 100)
);
create table if not exists public.investlab_personal_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  scenario jsonb not null check (jsonb_typeof(scenario) = 'object'),
  updated_at timestamptz not null default now()
);
-- If tables already exist, CREATE IF NOT EXISTS does NOT validate their structure.
-- Preflight must confirm columns, owner constraints and RLS policies before running.
alter table public.investlab_personal_holdings enable row level security;
alter table public.investlab_personal_cash enable row level security;
alter table public.investlab_personal_ledger enable row level security;
alter table public.investlab_personal_scenarios enable row level security;
alter table public.investlab_personal_holdings force row level security;
alter table public.investlab_personal_cash force row level security;
alter table public.investlab_personal_ledger force row level security;
alter table public.investlab_personal_scenarios force row level security;
-- Explicit user_id check prevents authenticated clients inserting rows for another user.
create policy personal_holdings_owner on public.investlab_personal_holdings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy personal_cash_owner on public.investlab_personal_cash for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy personal_ledger_owner on public.investlab_personal_ledger for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy personal_scenarios_owner on public.investlab_personal_scenarios for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.investlab_personal_holdings, public.investlab_personal_cash, public.investlab_personal_ledger, public.investlab_personal_scenarios from anon, public;
grant select, insert, update, delete on public.investlab_personal_holdings, public.investlab_personal_cash, public.investlab_personal_ledger, public.investlab_personal_scenarios to authenticated;
commit;
