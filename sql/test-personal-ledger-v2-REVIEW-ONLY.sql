-- INVESTLAB TEST v2: REVIEW ONLY; NEVER RUN IN PRODUCTION
-- Not idempotent. Verify target TEST project ID, backup, and RLS test plan before execution.
-- This is a fresh-install candidate, NOT an upgrade for existing personal tables.
begin;
create table public.investlab_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 100),
 created_at timestamptz not null default now(),
 unique(id,user_id)
);
create table public.investlab_ledger_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 account_id uuid not null,
 occurred_at timestamptz not null,
 event_type text not null check(event_type in ('opening','buy','sell','dividend','deposit','withdrawal','fee','adjustment','fx')),
 ticker text,
 memo text,
 source text,
 external_id text,
 created_at timestamptz not null default now(),
 foreign key(account_id,user_id) references public.investlab_accounts(id,user_id),
 unique(id,user_id),
 unique(user_id,source,external_id),
 check(ticker is null or ticker ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'),
 check(length(coalesce(memo,''))<=2000)
);
-- A signed quantity delta is explicit; zero is allowed only for informational events.
-- One event may have multiple currency/security legs. A trade has a security leg and cash leg.
create table public.investlab_ledger_legs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 event_id uuid not null,
 asset_type text not null check(asset_type in ('cash','security')),
 asset_code text not null check(asset_code ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'),
 quantity_delta numeric(26,8) not null check(quantity_delta <> 0),
 price_usd numeric(26,8) check(price_usd is null or price_usd>=0),
 fx_krw_per_usd numeric(20,6) check(fx_krw_per_usd is null or fx_krw_per_usd>0),
 foreign key(event_id,user_id) references public.investlab_ledger_events(id,user_id) on delete cascade,
 check((asset_type='cash' and asset_code in ('USD','KRW')) or (asset_type='security' and asset_code not in ('USD','KRW')))
);
create index investlab_ledger_events_owner_date_idx on public.investlab_ledger_events(user_id,occurred_at);
create index investlab_ledger_legs_event_idx on public.investlab_ledger_legs(event_id);
create table public.investlab_personal_symbols (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 ticker text not null check(ticker ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'),
 category text not null check(category in ('watchlist','past')),
 primary key(user_id,ticker,category)
);
create table public.investlab_personal_scenarios_v2 (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),
 payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<=262144),
 updated_at timestamptz not null default now()
);
alter table public.investlab_accounts enable row level security;
alter table public.investlab_ledger_events enable row level security;
alter table public.investlab_ledger_legs enable row level security;
alter table public.investlab_personal_symbols enable row level security;
alter table public.investlab_personal_scenarios_v2 enable row level security;
alter table public.investlab_accounts force row level security;
alter table public.investlab_ledger_events force row level security;
alter table public.investlab_ledger_legs force row level security;
alter table public.investlab_personal_symbols force row level security;
alter table public.investlab_personal_scenarios_v2 force row level security;
create policy accounts_owner on public.investlab_accounts for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy events_owner on public.investlab_ledger_events for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy legs_owner on public.investlab_ledger_legs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy symbols_owner on public.investlab_personal_symbols for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy scenarios_owner on public.investlab_personal_scenarios_v2 for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.investlab_accounts,public.investlab_ledger_events,public.investlab_ledger_legs,public.investlab_personal_symbols,public.investlab_personal_scenarios_v2 from anon,public;
grant select,insert,update,delete on public.investlab_accounts,public.investlab_ledger_events,public.investlab_ledger_legs,public.investlab_personal_symbols,public.investlab_personal_scenarios_v2 to authenticated;
-- IMPORTANT: direct client UPDATE/DELETE is only for initial RLS testing.
-- Do not enable real ledger posting until immutable event policies, atomic posting RPC,
-- cash/quantity invariant checks, concurrency and reversal workflows are implemented.
commit;
