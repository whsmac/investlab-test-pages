-- INVESTLAB TEST — atomic trade posting RPC CANDIDATE (NOT FOR EXECUTION)
-- Depends on test-personal-ledger-v2-REVIEW-ONLY.sql (also NOT approved).
-- Never execute on production. Not yet RLS / concurrency / privilege tested.
-- Security boundary: caller must be authenticated; owner account is checked.
-- Only buy/sell with USD settlement and zero fee supported in this draft.
create or replace function public.investlab_post_trade_v0(
 p_account_id uuid,
 p_request_id text,
 p_side text,
 p_ticker text,
 p_quantity numeric,
 p_unit_price_usd numeric,
 p_occurred_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_user uuid := (select auth.uid());
 v_event uuid;
 v_existing record;
 v_cash_delta numeric;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_request_id is null or length(p_request_id) not between 1 and 120
    or p_side not in ('buy','sell')
    or p_ticker is null or p_ticker !~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'
    or p_ticker in ('USD','KRW')
    or p_quantity is null or p_quantity<=0 or p_quantity>100000000000
    or p_unit_price_usd is null or p_unit_price_usd<=0 or p_unit_price_usd>100000000000
    or p_occurred_at is null then
   raise exception 'Invalid trade request' using errcode='22023';
 end if;
 -- Serialize writes per account. This row lock also protects against concurrent account deletion.
 perform 1 from public.investlab_accounts
 where id=p_account_id and user_id=v_user for update;
 if not found then raise exception 'Account not found' using errcode='42501'; end if;
 -- Same request ID is idempotent only if the request payload matches.
 select e.id,e.event_type,e.ticker,e.occurred_at,
        max(case when l.asset_type='security' then abs(l.quantity_delta) end) as qty,
        max(case when l.asset_type='security' then l.price_usd end) as unit_price
 into v_existing
 from public.investlab_ledger_events e
 join public.investlab_ledger_legs l on l.event_id=e.id and l.user_id=e.user_id
 where e.user_id=v_user and e.account_id=p_account_id
   and e.source='investlab_rpc_v0' and e.external_id=p_request_id
 group by e.id,e.event_type,e.ticker,e.occurred_at;
 if found then
   if v_existing.event_type<>p_side or v_existing.ticker<>p_ticker
      or v_existing.occurred_at<>p_occurred_at
      or v_existing.qty<>p_quantity or v_existing.unit_price<>p_unit_price_usd then
      raise exception 'Request ID reused with different trade' using errcode='23505';
   end if;
   return v_existing.id;
 end if;
 v_cash_delta := p_quantity*p_unit_price_usd;
 -- This draft does not support fees, short selling, margin, or negative cash.
 if p_side='buy' then
   if coalesce((select sum(l.quantity_delta)
     from public.investlab_ledger_legs l
     join public.investlab_ledger_events e on e.id=l.event_id and e.user_id=l.user_id
     where e.user_id=v_user and e.account_id=p_account_id and l.asset_type='cash' and l.asset_code='USD'),0) < v_cash_delta then
     raise exception 'Insufficient USD cash' using errcode='23514';
   end if;
   v_cash_delta := -v_cash_delta;
 else
   if coalesce((select sum(l.quantity_delta)
     from public.investlab_ledger_legs l
     join public.investlab_ledger_events e on e.id=l.event_id and e.user_id=l.user_id
     where e.user_id=v_user and e.account_id=p_account_id and l.asset_type='security' and l.asset_code=p_ticker),0) < p_quantity then
     raise exception 'Insufficient shares' using errcode='23514';
   end if;
 end if;
 insert into public.investlab_ledger_events
   (user_id,account_id,occurred_at,event_type,ticker,source,external_id)
 values(v_user,p_account_id,p_occurred_at,p_side,p_ticker,'investlab_rpc_v0',p_request_id)
 returning id into v_event;
 insert into public.investlab_ledger_legs
   (user_id,event_id,asset_type,asset_code,quantity_delta,price_usd)
 values
   (v_user,v_event,'security',p_ticker,case when p_side='buy' then p_quantity else -p_quantity end,p_unit_price_usd),
   (v_user,v_event,'cash','USD',v_cash_delta,null);
 return v_event;
end;
$$;
-- IMPORTANT: do NOT GRANT EXECUTE or deploy yet.
-- SECURITY DEFINER must have audited ownership and privileges, and direct
-- client writes to ledger tables must be revoked before this can be safe.
-- Account row lock alone is insufficient if another endpoint can write ledger rows.
