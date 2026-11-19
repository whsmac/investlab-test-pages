-- INVESTLAB TEST: OPENING BALANCE RPC CANDIDATE — REVIEW ONLY / DO NOT EXECUTE
-- Requires the reviewed five-table v2 schema; not a migration. Never run on production.
-- Dedicated function ownership, RLS and real authenticated A/B/anon tests still required.
begin;
create or replace function public.investlab_post_opening_v1(
 p_account_id uuid,
 p_request_id text,
 p_rows jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_owner uuid := (select auth.uid());
 v_event_id uuid;
 v_existing public.investlab_ledger_events%rowtype;
 v_row jsonb;
 v_asset_type text;
 v_asset_code text;
 v_delta numeric(26,8);
 v_cost numeric(26,8);
 v_count integer := 0;
 v_fingerprint text;
begin
 if v_owner is null then
  raise exception 'Authentication required' using errcode='28000';
 end if;
 if p_account_id is null or p_request_id is null
    or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'
    or p_rows is null or pg_catalog.jsonb_typeof(p_rows)<>'array'
    or pg_catalog.jsonb_array_length(p_rows) not between 1 and 200 then
  raise exception 'Invalid opening request' using errcode='22023';
 end if;
 -- One lock serializes all posts on an account; owner is derived exclusively from auth.uid().
 perform 1 from public.investlab_accounts a
 where a.id=p_account_id and a.user_id=v_owner for update;
 if not found then
  raise exception 'Account not found' using errcode='42501';
 end if;
 -- Request replay is only accepted when its canonical payload matches exactly.
 v_fingerprint := pg_catalog.md5(p_rows::text);
 select * into v_existing from public.investlab_ledger_events e
 where e.user_id=v_owner and e.account_id=p_account_id and e.request_id=p_request_id;
 if found then
  if v_existing.event_type<>'opening' or v_existing.ticker<>v_fingerprint then
   raise exception 'Conflicting request ID' using errcode='23505';
  end if;
  return v_existing.id;
 end if;
 if exists(
  select 1 from public.investlab_ledger_events e
  where e.user_id=v_owner and e.account_id=p_account_id and e.event_type='opening'
 ) then
  raise exception 'Opening already posted' using errcode='23505';
 end if;
 -- JSON rows: [{assetType:'cash'|'security',assetCode:'USD'|'KRW'|ticker,delta:'positive decimal',openingCostBasisUsd:'optional'}]
 -- Validate all rows before writing; PostgreSQL function execution is one transaction.
 for v_row in select value from pg_catalog.jsonb_array_elements(p_rows) loop
  if pg_catalog.jsonb_typeof(v_row)<>'object'
     or (v_row - 'assetType' - 'assetCode' - 'delta' - 'openingCostBasisUsd')<>'{}'::jsonb then
   raise exception 'Invalid opening row keys' using errcode='22023';
  end if;
  v_asset_type := v_row->>'assetType';
  v_asset_code := v_row->>'assetCode';
  if v_asset_type not in ('cash','security')
     or v_asset_code is null or v_asset_code !~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'
     or (v_asset_type='cash' and v_asset_code not in ('USD','KRW'))
     or (v_asset_type='security' and v_asset_code in ('USD-CASH','KRW')) then
   raise exception 'Invalid opening asset' using errcode='22023';
  end if;
  if pg_catalog.jsonb_typeof(v_row->'delta')<>'string'
     or (v_row->>'delta') !~ '^(0|[1-9][0-9]*)([.][0-9]{1,8})?$' then
   raise exception 'Invalid opening quantity' using errcode='22023';
  end if;
  v_delta := (v_row->>'delta')::numeric(26,8);
  if v_delta<=0 then raise exception 'Opening quantity must be positive' using errcode='22023'; end if;
  if v_asset_type='cash' and v_row ? 'openingCostBasisUsd' then
   raise exception 'Cash must not have cost basis' using errcode='22023';
  end if;
  if v_asset_type='security' then
   if pg_catalog.jsonb_typeof(v_row->'openingCostBasisUsd')<>'string'
      or (v_row->>'openingCostBasisUsd') !~ '^(0|[1-9][0-9]*)([.][0-9]{1,8})?$' then
    raise exception 'Security cost basis required' using errcode='22023';
   end if;
   v_cost := (v_row->>'openingCostBasisUsd')::numeric(26,8);
  else
   v_cost := null;
  end if;
  v_count := v_count + 1;
 end loop;
 if v_count=0 then raise exception 'Empty opening' using errcode='22023'; end if;
 -- Schema v2 permits ticker as an optional text field; here it holds the payload fingerprint.
 -- This is a CONTRACT CONFLICT: ticker validates as an asset symbol and cannot hold an MD5 hash.
 -- The RPC is deliberately blocked pending a dedicated payload_hash column or request table.
 raise exception 'BLOCKED: opening idempotency needs dedicated payload_hash column' using errcode='0A000';
end;
$$;
revoke all on function public.investlab_post_opening_v1(uuid,text,jsonb) from public,anon;
grant execute on function public.investlab_post_opening_v1(uuid,text,jsonb) to authenticated;
commit;
-- STOP. Function intentionally raises before any writes. NOT DEPLOYABLE.
