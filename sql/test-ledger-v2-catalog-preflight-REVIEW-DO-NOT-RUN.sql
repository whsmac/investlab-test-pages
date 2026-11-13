-- INVESTLAB TEST ONLY — READ-ONLY PREFLIGHT / REVIEW ONLY / DO NOT EXECUTE
-- Requires separate authorization before running against TEST Supabase.
-- Catalog inspection only; no schema changes, no user data reads or writes.
do $$
declare
 v_missing text[] := '{}';
 v_function_oid oid;
 v_digest_oid oid;
 v_table text;
 v_role text;
 v_has_exec boolean;
 v_rls record;
begin
 foreach v_table in array array[
  'investlab_accounts','investlab_ledger_events','investlab_ledger_legs',
  'investlab_personal_symbols','investlab_personal_scenarios_v2'
 ] loop
  select c.relrowsecurity,c.relforcerowsecurity into v_rls
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname=v_table and c.relkind in ('r','p');
  if not found then v_missing:=array_append(v_missing,'missing table public.'||v_table);
  elsif not v_rls.relrowsecurity or not v_rls.relforcerowsecurity then
   v_missing:=array_append(v_missing,'RLS/FORCE RLS absent on '||v_table);
  end if;
 end loop;
 if not exists(
  select 1 from pg_catalog.pg_attribute a
  where a.attrelid=pg_catalog.to_regclass('public.investlab_ledger_events')
    and a.attname='payload_hash' and not a.attisdropped and a.atttypid='text'::regtype
 ) then v_missing:=array_append(v_missing,'payload_hash text column missing'); end if;
 if not exists(
  select 1 from pg_catalog.pg_constraint c
  where c.conrelid=pg_catalog.to_regclass('public.investlab_ledger_events')
    and c.contype='u' and c.conkey is not null
    and (select array_agg(a.attname order by k.ordinality)
         from unnest(c.conkey) with ordinality as k(attnum,ordinality)
         join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum)
        = array['user_id','account_id','request_id']::name[]
 ) then v_missing:=array_append(v_missing,'unique owner/account/request key missing'); end if;
 select p.oid into v_digest_oid from pg_catalog.pg_proc p
 join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname='extensions' and p.proname='digest'
   and pg_catalog.pg_get_function_identity_arguments(p.oid)='bytea, text';
 if v_digest_oid is null then v_missing:=array_append(v_missing,'extensions.digest(bytea,text) missing'); end if;
 select pg_catalog.to_regprocedure('public.investlab_post_opening_v1(uuid,text,jsonb,text)') into v_function_oid;
 if v_function_oid is null then v_missing:=array_append(v_missing,'opening RPC v2 missing');
 else
  foreach v_role in array array['anon','authenticated'] loop
   select pg_catalog.has_function_privilege(v_role,v_function_oid,'EXECUTE') into v_has_exec;
   if v_role='anon' and v_has_exec then v_missing:=array_append(v_missing,'anon can execute opening RPC'); end if;
   if v_role='authenticated' and not v_has_exec then v_missing:=array_append(v_missing,'authenticated cannot execute opening RPC'); end if;
  end loop;
  if pg_catalog.has_function_privilege('public',v_function_oid,'EXECUTE') then
   v_missing:=array_append(v_missing,'PUBLIC can execute opening RPC');
  end if;
 end if;
 if array_length(v_missing,1)>0 then
  raise notice 'TEST preflight NOT READY: %',array_to_string(v_missing,'; ');
 else
  raise notice 'TEST catalog preflight checks passed; live A/B/anon and rollback tests STILL REQUIRED';
 end if;
end;
$$;
-- STOP. This is NOT a deployment approval, and does not prove row isolation.
