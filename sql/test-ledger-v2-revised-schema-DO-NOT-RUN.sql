-- INVESTLAB TEST V2 REVISED SCHEMA CANDIDATE -- REVIEW ONLY / DO NOT EXECUTE
-- This is a separate fresh-install design, not an ALTER migration. Never run on production.
-- No RPCs, onboarding, opening posting, deposits, or trade posting are installed here.
begin;
create table public.investlab_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 100),
 request_id text not null check(length(request_id) between 1 and 120),
 created_at timestamptz not null default now(),
 unique(id,user_id),unique(user_id,request_id)
);
create table public.investlab_ledger_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null,
 request_id text not null check(length(request_id) between 1 and 120),
 occurred_at timestamptz not null,
 event_type text not null check(event_type in ('opening','buy','sell','deposit','withdrawal','fee','reversal')),
 ticker text check(ticker is null or (ticker ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$' and ticker not in ('USD-CASH','KRW'))),
 created_at timestamptz not null default now(),
 foreign key(account_id,user_id) references public.investlab_accounts(id,user_id),
 unique(id,user_id),unique(user_id,account_id,request_id)
);
create table public.investlab_ledger_legs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id uuid not null,
 asset_type text not null check(asset_type in ('cash','security')),
 asset_code text not null check(asset_code ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'),
 quantity_delta numeric(26,8) not null check(quantity_delta<>0),
 opening_cost_basis_usd numeric(26,8) check(opening_cost_basis_usd is null or opening_cost_basis_usd>=0),
 foreign key(event_id,user_id) references public.investlab_ledger_events(id,user_id),
 check((asset_type='cash' and asset_code in ('USD','KRW')) or (asset_type='security' and asset_code not in ('USD-CASH','KRW'))),
 unique(event_id,asset_type,asset_code)
);
create index investlab_events_owner_account_date_idx on public.investlab_ledger_events(user_id,account_id,occurred_at);
create index investlab_legs_owner_event_idx on public.investlab_ledger_legs(user_id,event_id);
create table public.investlab_personal_symbols (
 user_id uuid not null references auth.users(id) on delete cascade,
 ticker text not null check(ticker ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'),
 category text not null check(category in ('watchlist','past')),
 primary key(user_id,ticker,category)
);
create table public.investlab_personal_scenarios_v2 (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 80),
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
create policy accounts_read on public.investlab_accounts for select to authenticated using ((select auth.uid())=user_id);
create policy events_read on public.investlab_ledger_events for select to authenticated using ((select auth.uid())=user_id);
create policy legs_read on public.investlab_ledger_legs for select to authenticated using ((select auth.uid())=user_id);
create policy symbols_read on public.investlab_personal_symbols for select to authenticated using ((select auth.uid())=user_id);
create policy scenarios_read on public.investlab_personal_scenarios_v2 for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.investlab_accounts,public.investlab_ledger_events,public.investlab_ledger_legs,public.investlab_personal_symbols,public.investlab_personal_scenarios_v2 from public,anon,authenticated;
grant select on public.investlab_accounts,public.investlab_ledger_events,public.investlab_ledger_legs,public.investlab_personal_symbols,public.investlab_personal_scenarios_v2 to authenticated;
commit;
-- STOP. Read-only schema contract only. No account or opening RPC exists.
-- Multi-leg event validity, chronological oversell, concurrency, FX, tax-lot and
-- atomic posting still require server-side functions and independent review.
