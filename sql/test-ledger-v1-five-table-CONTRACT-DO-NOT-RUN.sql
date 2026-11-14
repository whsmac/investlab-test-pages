-- INVESTLAB TEST ONLY: REVIEW CANDIDATE; DO NOT EXECUTE.
-- New five-table contract candidate, static review only; not deployable.
-- Requires security review, real A/B/anon RLS tests, backup, rollback and user approval.
-- No existing personal tables may have these names. NEVER run on production.
-- Requires onboarding, opening balances, rollback and real RLS evidence.
begin;
-- Personal watchlist/scenarios are SELECT-only in this review candidate.
-- Separate RPCs and owner-isolation tests required before saving them.
create table public.investlab_personal_symbols (
 user_id uuid not null references auth.users(id) on delete cascade,
 ticker text not null check(ticker ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}create table public.investlab_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 100),
 created_at timestamptz not null default now(),
 unique(id,user_id)
);
create table public.investlab_ledger_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null,
 occurred_at timestamptz not null,
 event_type text not null check(event_type in ('buy','sell')),
 ticker text not null check(ticker ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$' and ticker not in ('USD-CASH','KRW')),
 quantity numeric(26,8) not null check(quantity>0),
 unit_price_usd numeric(26,8) not null check(unit_price_usd>0),
 request_id text not null check(length(request_id) between 1 and 120),
 created_at timestamptz not null default now(),
 foreign key(account_id,user_id) references public.investlab_accounts(id,user_id),
 unique(user_id,account_id,request_id),
 unique(id,user_id)
);
create table public.investlab_ledger_legs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id uuid not null,
 asset_type text not null check(asset_type in ('cash','security')),
 asset_code text not null check(asset_code ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'),
 quantity_delta numeric(26,8) not null check(quantity_delta<>0),
 foreign key(event_id,user_id) references public.investlab_ledger_events(id,user_id),
 unique(event_id,asset_type),
 check((asset_type='cash' and asset_code='USD') or (asset_type='security' and asset_code not in ('USD-CASH','KRW')))
);
create index investlab_ledger_events_account_idx on public.investlab_ledger_events(user_id,account_id,occurred_at);
create index investlab_ledger_legs_event_idx on public.investlab_ledger_legs(event_id);
alter table public.investlab_accounts enable row level security;
alter table public.investlab_ledger_events enable row level security;
alter table public.investlab_ledger_legs enable row level security;
alter table public.investlab_accounts force row level security;
alter table public.investlab_ledger_events force row level security;
alter table public.investlab_ledger_legs force row level security;
create policy account_read on public.investlab_accounts for select to authenticated using ((select auth.uid())=user_id);
create policy ledger_event_read on public.investlab_ledger_events for select to authenticated using ((select auth.uid())=user_id);
create policy ledger_leg_read on public.investlab_ledger_legs for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.investlab_accounts,public.investlab_ledger_events,public.investlab_ledger_legs from public,anon,authenticated;
grant select on public.investlab_accounts,public.investlab_ledger_events,public.investlab_ledger_legs to authenticated;
-- The database owner / service roles retain privileged access: audit separately.
-- No client account creation in this migration: onboarding requires separately reviewed RPC.
create function public.investlab_post_trade_v1(
 p_account_id uuid,p_request_id text,p_side text,p_ticker text,
 p_quantity numeric,p_unit_price_usd numeric,p_occurred_at timestamptz
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid := (select auth.uid());
 v_old public.investlab_ledger_events%rowtype;
 v_event_id uuid;
 v_amount numeric;
 v_cash numeric;
 v_shares numeric;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_request_id is null or length(p_request_id) not between 1 and 120
    or p_side is null or p_side not in ('buy','sell')
    or p_ticker is null or p_ticker !~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'
    or p_ticker in ('USD-CASH','KRW')
    or p_quantity is null or p_quantity<=0 or p_quantity>100000000000
    or p_unit_price_usd is null or p_unit_price_usd<=0 or p_unit_price_usd>100000000000
    or p_occurred_at is null then
   raise exception 'Invalid trade' using errcode='22023';
 end if;
 v_amount:=p_quantity*p_unit_price_usd;
 if v_amount>100000000000000000 or round(v_amount,8)<>v_amount then
   raise exception 'Invalid trade amount precision' using errcode='22023';
 end if;
 -- Serialize every posting for the same account.
 perform 1 from public.investlab_accounts where id=p_account_id and user_id=v_user for update;
 if not found then raise exception 'Account not found' using errcode='42501'; end if;
 select * into v_old from public.investlab_ledger_events
 where user_id=v_user and account_id=p_account_id and request_id=p_request_id;
 if found then
   if v_old.event_type<>p_side or v_old.ticker<>p_ticker
      or v_old.quantity<>p_quantity or v_old.unit_price_usd<>p_unit_price_usd
      or v_old.occurred_at<>p_occurred_at then
      raise exception 'Conflicting request ID' using errcode='23505';
   end if;
   return v_old.id;
 end if;
 if p_side='buy' then
   select coalesce(sum(l.quantity_delta),0) into v_cash
   from public.investlab_ledger_legs l join public.investlab_ledger_events e
     on e.id=l.event_id and e.user_id=l.user_id
   where e.user_id=v_user and e.account_id=p_account_id and l.asset_type='cash' and l.asset_code='USD';
   if v_cash<v_amount then raise exception 'Insufficient USD cash' using errcode='23514'; end if;
 else
   select coalesce(sum(l.quantity_delta),0) into v_shares
   from public.investlab_ledger_legs l join public.investlab_ledger_events e
     on e.id=l.event_id and e.user_id=l.user_id
   where e.user_id=v_user and e.account_id=p_account_id and l.asset_type='security' and l.asset_code=p_ticker;
   if v_shares<p_quantity then raise exception 'Insufficient shares' using errcode='23514'; end if;
 end if;
 insert into public.investlab_ledger_events
 (user_id,account_id,occurred_at,event_type,ticker,quantity,unit_price_usd,request_id)
 values(v_user,p_account_id,p_occurred_at,p_side,p_ticker,p_quantity,p_unit_price_usd,p_request_id)
 returning id into v_event_id;
 insert into public.investlab_ledger_legs(user_id,event_id,asset_type,asset_code,quantity_delta)
 values
 (v_user,v_event_id,'security',p_ticker,case when p_side='buy' then p_quantity else -p_quantity end),
 (v_user,v_event_id,'cash','USD',case when p_side='buy' then -v_amount else v_amount end);
 return v_event_id;
end;
$$;
-- PostgreSQL grants PUBLIC EXECUTE by default. Revoke in same transaction.
revoke all on function public.investlab_post_trade_v1(uuid,text,text,text,numeric,numeric,timestamptz) from public,anon;
grant execute on function public.investlab_post_trade_v1(uuid,text,text,text,numeric,numeric,timestamptz) to authenticated;
commit;
-- STOP: still not deployable for actual use. No opening balance/deposit/onboarding RPC,
-- fees, tax lots, FX, reversals, historical oversell checks or real RLS tests.
-- SECURITY DEFINER function ownership must be reviewed before any deployment.
),
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
alter table public.investlab_personal_symbols enable row level security;
alter table public.investlab_personal_scenarios_v2 enable row level security;
alter table public.investlab_personal_symbols force row level security;
alter table public.investlab_personal_scenarios_v2 force row level security;
create policy symbols_owner_read on public.investlab_personal_symbols for select to authenticated using ((select auth.uid())=user_id);
create policy scenarios_owner_read on public.investlab_personal_scenarios_v2 for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.investlab_personal_symbols,public.investlab_personal_scenarios_v2 from public,anon,authenticated;
grant select on public.investlab_personal_symbols,public.investlab_personal_scenarios_v2 to authenticated;
create table public.investlab_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 100),
 created_at timestamptz not null default now(),
 unique(id,user_id)
);
create table public.investlab_ledger_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null,
 occurred_at timestamptz not null,
 event_type text not null check(event_type in ('buy','sell')),
 ticker text not null check(ticker ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$' and ticker not in ('USD-CASH','KRW')),
 quantity numeric(26,8) not null check(quantity>0),
 unit_price_usd numeric(26,8) not null check(unit_price_usd>0),
 request_id text not null check(length(request_id) between 1 and 120),
 created_at timestamptz not null default now(),
 foreign key(account_id,user_id) references public.investlab_accounts(id,user_id),
 unique(user_id,account_id,request_id),
 unique(id,user_id)
);
create table public.investlab_ledger_legs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id uuid not null,
 asset_type text not null check(asset_type in ('cash','security')),
 asset_code text not null check(asset_code ~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'),
 quantity_delta numeric(26,8) not null check(quantity_delta<>0),
 foreign key(event_id,user_id) references public.investlab_ledger_events(id,user_id),
 unique(event_id,asset_type),
 check((asset_type='cash' and asset_code='USD') or (asset_type='security' and asset_code not in ('USD-CASH','KRW')))
);
create index investlab_ledger_events_account_idx on public.investlab_ledger_events(user_id,account_id,occurred_at);
create index investlab_ledger_legs_event_idx on public.investlab_ledger_legs(event_id);
alter table public.investlab_accounts enable row level security;
alter table public.investlab_ledger_events enable row level security;
alter table public.investlab_ledger_legs enable row level security;
alter table public.investlab_accounts force row level security;
alter table public.investlab_ledger_events force row level security;
alter table public.investlab_ledger_legs force row level security;
create policy account_read on public.investlab_accounts for select to authenticated using ((select auth.uid())=user_id);
create policy ledger_event_read on public.investlab_ledger_events for select to authenticated using ((select auth.uid())=user_id);
create policy ledger_leg_read on public.investlab_ledger_legs for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.investlab_accounts,public.investlab_ledger_events,public.investlab_ledger_legs from public,anon,authenticated;
grant select on public.investlab_accounts,public.investlab_ledger_events,public.investlab_ledger_legs to authenticated;
-- The database owner / service roles retain privileged access: audit separately.
-- No client account creation in this migration: onboarding requires separately reviewed RPC.
create function public.investlab_post_trade_v1(
 p_account_id uuid,p_request_id text,p_side text,p_ticker text,
 p_quantity numeric,p_unit_price_usd numeric,p_occurred_at timestamptz
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid := (select auth.uid());
 v_old public.investlab_ledger_events%rowtype;
 v_event_id uuid;
 v_amount numeric;
 v_cash numeric;
 v_shares numeric;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_request_id is null or length(p_request_id) not between 1 and 120
    or p_side is null or p_side not in ('buy','sell')
    or p_ticker is null or p_ticker !~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'
    or p_ticker in ('USD-CASH','KRW')
    or p_quantity is null or p_quantity<=0 or p_quantity>100000000000
    or p_unit_price_usd is null or p_unit_price_usd<=0 or p_unit_price_usd>100000000000
    or p_occurred_at is null then
   raise exception 'Invalid trade' using errcode='22023';
 end if;
 v_amount:=p_quantity*p_unit_price_usd;
 if v_amount>100000000000000000 or round(v_amount,8)<>v_amount then
   raise exception 'Invalid trade amount precision' using errcode='22023';
 end if;
 -- Serialize every posting for the same account.
 perform 1 from public.investlab_accounts where id=p_account_id and user_id=v_user for update;
 if not found then raise exception 'Account not found' using errcode='42501'; end if;
 select * into v_old from public.investlab_ledger_events
 where user_id=v_user and account_id=p_account_id and request_id=p_request_id;
 if found then
   if v_old.event_type<>p_side or v_old.ticker<>p_ticker
      or v_old.quantity<>p_quantity or v_old.unit_price_usd<>p_unit_price_usd
      or v_old.occurred_at<>p_occurred_at then
      raise exception 'Conflicting request ID' using errcode='23505';
   end if;
   return v_old.id;
 end if;
 if p_side='buy' then
   select coalesce(sum(l.quantity_delta),0) into v_cash
   from public.investlab_ledger_legs l join public.investlab_ledger_events e
     on e.id=l.event_id and e.user_id=l.user_id
   where e.user_id=v_user and e.account_id=p_account_id and l.asset_type='cash' and l.asset_code='USD';
   if v_cash<v_amount then raise exception 'Insufficient USD cash' using errcode='23514'; end if;
 else
   select coalesce(sum(l.quantity_delta),0) into v_shares
   from public.investlab_ledger_legs l join public.investlab_ledger_events e
     on e.id=l.event_id and e.user_id=l.user_id
   where e.user_id=v_user and e.account_id=p_account_id and l.asset_type='security' and l.asset_code=p_ticker;
   if v_shares<p_quantity then raise exception 'Insufficient shares' using errcode='23514'; end if;
 end if;
 insert into public.investlab_ledger_events
 (user_id,account_id,occurred_at,event_type,ticker,quantity,unit_price_usd,request_id)
 values(v_user,p_account_id,p_occurred_at,p_side,p_ticker,p_quantity,p_unit_price_usd,p_request_id)
 returning id into v_event_id;
 insert into public.investlab_ledger_legs(user_id,event_id,asset_type,asset_code,quantity_delta)
 values
 (v_user,v_event_id,'security',p_ticker,case when p_side='buy' then p_quantity else -p_quantity end),
 (v_user,v_event_id,'cash','USD',case when p_side='buy' then -v_amount else v_amount end);
 return v_event_id;
end;
$$;
-- PostgreSQL grants PUBLIC EXECUTE by default. Revoke in same transaction.
revoke all on function public.investlab_post_trade_v1(uuid,text,text,text,numeric,numeric,timestamptz) from public,anon;
grant execute on function public.investlab_post_trade_v1(uuid,text,text,text,numeric,numeric,timestamptz) to authenticated;
commit;
-- STOP: still not deployable for actual use. No opening balance/deposit/onboarding RPC,
-- fees, tax lots, FX, reversals, historical oversell checks or real RLS tests.
-- SECURITY DEFINER function ownership must be reviewed before any deployment.
