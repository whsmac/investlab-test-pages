-- INVESTLAB TEST v2 opening RPC: REVIEW ONLY / DO NOT EXECUTE
-- Candidate for fresh v2 schema plus payload_hash amendment; NOT a deployment script.
-- Requires verified pgcrypto digest location, function owner/RLS privileges and A/B/anon integration tests.
begin;
create or replace function public.investlab_post_opening_v1(
 p_account_id uuid, p_request_id text, p_rows jsonb, p_payload_hash text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 v_owner uuid := (select auth.uid());
 v_existing public.investlab_ledger_events%rowtype;
 v_event_id uuid;
 v_row jsonb;
 v_type text;
 v_code text;
 v_delta numeric(26,8);
 v_cost numeric(26,8);
 v_rows jsonb := '[]'::jsonb;
 v_canonical text;
 v_server_hash text;
begin
 if v_owner is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_account_id is null or p_request_id is null or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'
    or p_rows is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 200
    or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
  raise exception 'Invalid opening request' using errcode='22023';
 end if;
 perform 1 from public.investlab_accounts a where a.id=p_account_id and a.user_id=v_owner for update;
 if not found then raise exception 'Account not found' using errcode='42501'; end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(v_row)<>'object' or (v_row - 'assetType' - 'assetCode' - 'delta' - 'openingCostBasisUsd') <> '{}'::jsonb then
   raise exception 'Unexpected opening fields' using errcode='22023';
  end if;
  v_type := v_row->>'assetType'; v_code := v_row->>'assetCode';
  if v_type is null or v_type not in ('cash','security') or v_code is null or v_code !~ '^[A-Z0-9][A-Z0-9.^_-]{0,19}$'
     or (v_type='cash' and v_code not in ('USD','KRW'))
     or (v_type='security' and v_code in ('USD','KRW','USD-CASH')) then
   raise exception 'Invalid opening asset' using errcode='22023';
  end if;
  if jsonb_typeof(v_row->'delta')<>'string' or (v_row->>'delta') !~ '^(0|[1-9][0-9]*)([.][0-9]{1,8})?$' then
   raise exception 'Invalid opening quantity' using errcode='22023';
  end if;
  v_delta := (v_row->>'delta')::numeric(26,8);
  if v_delta<=0 then raise exception 'Quantity must be positive' using errcode='22023'; end if;
  if v_type='cash' then
   if v_row ? 'openingCostBasisUsd' then raise exception 'Cash cost basis forbidden' using errcode='22023'; end if;
   v_cost := null;
  else
   if jsonb_typeof(v_row->'openingCostBasisUsd')<>'string'
      or (v_row->>'openingCostBasisUsd') !~ '^(0|[1-9][0-9]*)([.][0-9]{1,8})?$' then
    raise exception 'Missing security cost basis' using errcode='22023';
   end if;
   v_cost := (v_row->>'openingCostBasisUsd')::numeric(26,8);
  end if;
  if exists(select 1 from jsonb_array_elements(v_rows) x where x->>'assetType'=v_type and x->>'assetCode'=v_code) then
   raise exception 'Duplicate opening asset' using errcode='23505';
  end if;
  v_rows := v_rows || jsonb_build_array(
    case when v_type='cash'
    then jsonb_build_object('assetType',v_type,'assetCode',v_code,'delta',trim(to_char(v_delta,'FM999999999999999999.00000000')))
    else jsonb_build_object('assetType',v_type,'assetCode',v_code,'delta',trim(to_char(v_delta,'FM999999999999999999.00000000')),
      'openingCostBasisUsd',trim(to_char(v_cost,'FM999999999999999999.00000000'))) end
  );
 end loop;
 -- JSON object key order must match JS canonicalOpeningPayload: assetType,assetCode,delta,openingCostBasisUsd.
 -- SQL JSONB reorders keys; serialize row objects explicitly and sort by assetType:assetCode.
 select '{"version":1,"eventType":"opening","accountId":'||to_json(p_account_id::text)::text||
  ',"requestId":'||to_json(p_request_id)::text||',"rows":['||
  string_agg(
   '{"assetType":'||to_json(x->>'assetType')::text||',"assetCode":'||to_json(x->>'assetCode')::text||
   ',"delta":'||to_json(x->>'delta')::text||
   case when x->>'assetType'='security' then ',"openingCostBasisUsd":'||to_json(x->>'openingCostBasisUsd')::text else '' end||'}',
   ',' order by ((x->>'assetType')||':'||(x->>'assetCode')) collate "C"
  )||']}' into v_canonical from jsonb_array_elements(v_rows) x;
 -- pgcrypto digest resolution is deployment-specific; schema qualification must be verified in TEST.
 -- IMPORTANT: server JSON to_json() escaping, collation and numeric rendering need real PostgreSQL parity tests.
 v_server_hash := encode(extensions.digest(convert_to(v_canonical,'UTF8'),'sha256'),'hex');
 if v_server_hash<>p_payload_hash then raise exception 'Opening payload hash mismatch' using errcode='22023'; end if;
 select * into v_existing from public.investlab_ledger_events e
 where e.user_id=v_owner and e.account_id=p_account_id and e.request_id=p_request_id;
 if found then
  if v_existing.event_type<>'opening' or v_existing.payload_hash<>v_server_hash then
   raise exception 'Conflicting request ID' using errcode='23505';
  end if;
  return v_existing.id;
 end if;
 if exists(select 1 from public.investlab_ledger_events e
  where e.user_id=v_owner and e.account_id=p_account_id and e.event_type='opening') then
  raise exception 'Opening already posted' using errcode='23505';
 end if;
 insert into public.investlab_ledger_events(user_id,account_id,request_id,occurred_at,event_type,payload_hash)
 values(v_owner,p_account_id,p_request_id,now(),'opening',v_server_hash) returning id into v_event_id;
 insert into public.investlab_ledger_legs(user_id,event_id,asset_type,asset_code,quantity_delta,opening_cost_basis_usd)
 select v_owner,v_event_id,x->>'assetType',x->>'assetCode',(x->>'delta')::numeric(26,8),
  case when x->>'assetType'='security' then (x->>'openingCostBasisUsd')::numeric(26,8) else null end
 from jsonb_array_elements(v_rows) x;
 return v_event_id;
end;
$$;
revoke all on function public.investlab_post_opening_v1(uuid,text,jsonb,text) from public,anon;
grant execute on function public.investlab_post_opening_v1(uuid,text,jsonb,text) to authenticated;
commit;
-- STOP. Review only. Requires independent SQL execution tests before any TEST installation.
