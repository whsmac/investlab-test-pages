-- ISOLATED POSTGRES FIXTURE ONLY. Not a Supabase migration or production RPC.
-- This function deliberately lives in a fixture schema; no existing table is touched.
create function restore_fixture.restore_atomic(
 p_owner uuid,p_expected_ledger jsonb,p_expected_strategies jsonb,
 p_ledger jsonb,p_strategies jsonb
) returns jsonb
language plpgsql security invoker set search_path=''
as $fn$
declare uid uuid := auth.uid();
 actual_ledger jsonb;
 actual_strategies jsonb;
 item record;
 group_size integer;
 affected integer;
begin
 if uid is null or p_owner is distinct from uid then
  raise exception 'owner mismatch' using errcode='42501';
 end if;
 if pg_catalog.jsonb_typeof(p_expected_strategies) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_strategies) is distinct from 'object' then
  raise exception 'invalid strategies' using errcode='22023';
 end if;
 if p_ledger is not null and
    (pg_catalog.jsonb_typeof(p_ledger) is distinct from 'object'
     or p_ledger->>'version' is distinct from '1'
     or pg_catalog.jsonb_typeof(p_ledger->'accounts') is distinct from 'array'
     or pg_catalog.jsonb_typeof(p_ledger->'entries') is distinct from 'array'
     or pg_catalog.octet_length(p_ledger::text)>700000) then
  raise exception 'invalid ledger envelope' using errcode='22023';
 end if;
 if (select count(*) from pg_catalog.jsonb_object_keys(p_strategies))>30
    or pg_catalog.octet_length(p_strategies::text)>1048576 then
  raise exception 'strategy quota' using errcode='22023';
 end if;
 for item in select key,value from pg_catalog.jsonb_each(p_strategies) loop
  if pg_catalog.char_length(pg_catalog.btrim(item.key)) not between 1 and 80
     or item.key in ('__proto__','constructor','prototype')
     or pg_catalog.jsonb_typeof(item.value) is distinct from 'array' then
   raise exception 'invalid strategy envelope' using errcode='22023';
  end if;
  group_size:=pg_catalog.jsonb_array_length(item.value);
  if group_size not between 1 and 30 then
   raise exception 'invalid strategy count' using errcode='22023';
  end if;
 end loop;
 perform restore_fixture.validate_ledger_domain(p_ledger);
 perform restore_fixture.validate_strategy_domain(p_strategies);
 -- Existing clients write directly, so advisory locking alone is insufficient.
 -- Table-level locking is intentionally coarse for the small-user fixture.
 -- NOWAIT means a concurrent writer causes an error, not a silent overwrite.
 lock table restore_fixture.ledger,restore_fixture.strategies
  in share row exclusive mode nowait;
 select pg_catalog.jsonb_build_object('payload',payload,'updated_at',updated_at)
 into actual_ledger from restore_fixture.ledger where user_id=uid;
 select coalesce(pg_catalog.jsonb_object_agg(name,
    pg_catalog.jsonb_build_object('strategies',strategies,'updated_at',updated_at)),'{}'::jsonb)
 into actual_strategies from restore_fixture.strategies where user_id=uid;
 if actual_ledger is distinct from p_expected_ledger
    or actual_strategies is distinct from p_expected_strategies then
  raise exception 'stale restore review' using errcode='40001';
 end if;
 if (select count(*) from (
    select key from pg_catalog.jsonb_object_keys(actual_strategies) as k(key)
    union select key from pg_catalog.jsonb_object_keys(p_strategies) as k(key)
   ) as names)>100 then
  raise exception 'resulting strategy quota' using errcode='22023';
 end if;
 -- SQL NULL means preserve. An empty ledger object is an explicit replacement.
 if p_ledger is not null then
  insert into restore_fixture.ledger(user_id,payload,updated_at)
   values(uid,p_ledger,pg_catalog.clock_timestamp())
   on conflict(user_id) do update set payload=excluded.payload,updated_at=excluded.updated_at;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'ledger write mismatch'; end if;
 end if;
 for item in select key,value from pg_catalog.jsonb_each(p_strategies) loop
  insert into restore_fixture.strategies(user_id,name,strategies,updated_at)
   values(uid,item.key,item.value,pg_catalog.clock_timestamp())
   on conflict(user_id,name) do update set strategies=excluded.strategies,updated_at=excluded.updated_at;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'strategy write mismatch'; end if;
 end loop;
 -- No exception handler swallowing errors: an error aborts all writes in this call.
 return pg_catalog.jsonb_build_object('status','FIXTURE_ONLY','ledger_written',p_ledger is not null,
  'strategy_groups_written',(select count(*) from pg_catalog.jsonb_object_keys(p_strategies)));
end;
$fn$;
revoke all on function restore_fixture.restore_atomic(uuid,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function restore_fixture.restore_atomic(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated;
