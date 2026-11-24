\set ON_ERROR_STOP on
-- Disposable local PostgreSQL ONLY. No network/database credentials from the project.
-- The workflow starts a new postgres container, and invokes this file inside it.
begin;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('restore_fixture.uid',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create schema restore_fixture;
grant usage on schema restore_fixture to anon,authenticated;
create table restore_fixture.ledger(
 user_id uuid primary key,payload jsonb not null,updated_at timestamptz not null
);
create table restore_fixture.strategies(
 user_id uuid not null,name text not null,strategies jsonb not null,updated_at timestamptz not null,
 primary key(user_id,name),
 -- Inject a database failure after the earlier ledger write for rollback testing.
 constraint injected_failure check (name <> 'fail-write')
);
alter table restore_fixture.ledger enable row level security;
alter table restore_fixture.strategies enable row level security;
alter table restore_fixture.ledger force row level security;
alter table restore_fixture.strategies force row level security;
grant select,insert,update on restore_fixture.ledger,restore_fixture.strategies to authenticated;
create policy own_ledger on restore_fixture.ledger to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_strategies on restore_fixture.strategies to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
\ir atomic_restore_fixture_domain.sql
\ir atomic_restore_fixture_function.sql
insert into restore_fixture.ledger values
 ('11111111-1111-4111-8111-111111111111','{"version":1,"accounts":[],"entries":[]}','2026-01-01Z'),
 ('22222222-2222-4222-8222-222222222222','{"version":1,"accounts":[{"id":"B","name":"B fixture"}],"entries":[]}','2026-01-01Z');
insert into restore_fixture.strategies values
 ('11111111-1111-4111-8111-111111111111','keep','[{"name":"keep","trades":[]}]','2026-01-01Z'),
 ('22222222-2222-4222-8222-222222222222','private','[{"name":"B","trades":[]}]','2026-01-01Z');
set local role authenticated;
select set_config('restore_fixture.uid','11111111-1111-4111-8111-111111111111',true);
do $test$
declare
 a constant uuid:='11111111-1111-4111-8111-111111111111';
 b constant uuid:='22222222-2222-4222-8222-222222222222';
 l jsonb; s jsonb; changed jsonb;
 replacement constant jsonb:='{"version":1,"accounts":[{"id":"A","name":"A fixture"}],"entries":[]}';
begin
 select jsonb_build_object('payload',payload,'updated_at',updated_at) into l from restore_fixture.ledger where user_id=a;
 select jsonb_object_agg(name,jsonb_build_object('strategies',strategies,'updated_at',updated_at)) into s from restore_fixture.strategies where user_id=a;
 if exists(select 1 from restore_fixture.ledger where user_id=b) or exists(select 1 from restore_fixture.strategies where user_id=b) then raise exception 'RLS leakage'; end if;
 begin
  perform restore_fixture.restore_atomic(b,null,'{}',replacement,'{}');
  raise exception 'foreign owner accepted';
 exception when insufficient_privilege then null; end;
 begin
  perform restore_fixture.restore_atomic(a,l,s,replacement,'{"fail-write":[{"name":"fail","trades":[]}]}');
  raise exception 'failure injection did not fail';
 exception when check_violation then null; end;
 select jsonb_build_object('payload',payload,'updated_at',updated_at) into changed from restore_fixture.ledger where user_id=a;
 if changed is distinct from l then raise exception 'ledger rollback failed'; end if;
 select jsonb_object_agg(name,jsonb_build_object('strategies',strategies,'updated_at',updated_at)) into changed from restore_fixture.strategies where user_id=a;
 if changed is distinct from s then raise exception 'strategy rollback failed'; end if;
 begin
  perform restore_fixture.restore_atomic(a,l,'{}',replacement,'{}');
  raise exception 'stale strategy snapshot accepted';
 exception when serialization_failure then null; end;
 begin
  perform restore_fixture.restore_atomic(a,null,s,replacement,'{}');
  raise exception 'stale ledger snapshot accepted';
 exception when serialization_failure then null; end;
 perform restore_fixture.restore_atomic(a,l,s,replacement,'{"new":[{"name":"new","trades":[]}]}');
 if (select payload from restore_fixture.ledger where user_id=a) is distinct from replacement then raise exception 'ledger not replaced'; end if;
 if (select count(*) from restore_fixture.strategies where user_id=a)<>2 then raise exception 'strategy add/preserve failed'; end if;
 select jsonb_build_object('payload',payload,'updated_at',updated_at) into l from restore_fixture.ledger where user_id=a;
 select jsonb_object_agg(name,jsonb_build_object('strategies',strategies,'updated_at',updated_at)) into s from restore_fixture.strategies where user_id=a;
 perform restore_fixture.restore_atomic(a,l,s,null,'{}');
 select jsonb_build_object('payload',payload,'updated_at',updated_at) into changed from restore_fixture.ledger where user_id=a;
 if changed is distinct from l then raise exception 'null ledger should preserve'; end if;
 -- Domain failures must leave both tables unchanged.
 declare
  bad jsonb;
  good constant jsonb:='{"version":1,"accounts":[{"id":"A","name":"A fixture"}],"entries":[{"id":"buy","accountId":"A","date":"2026-01-02","type":"BUY","currency":"USD","symbol":"TSLA","qty":2,"price":100},{"id":"deposit","accountId":"A","date":"2026-01-01","type":"DEPOSIT","currency":"USD","amount":1000},{"id":"sell","accountId":"A","date":"2026-01-03","type":"SELL","currency":"USD","symbol":"TSLA","qty":1,"price":150},{"id":"fx","accountId":"A","date":"2026-01-04","type":"FX","currency":"USD","amount":100,"toCurrency":"KRW","toAmount":140000}]}';
 begin
  perform restore_fixture.validate_ledger_domain(good);
  for bad in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_set(good,'{entries,0,qty}','20'),
   jsonb_set(good,'{entries,2,qty}','3'),
   jsonb_set(good,'{entries,0,accountId}','"B"'),
   jsonb_set(good,'{entries,0,id}','"deposit"'),
   jsonb_set(good,'{entries,0,date}','"2026-02-30"'),
   jsonb_set(good,'{entries,1,amount}','true'),
   jsonb_set(good,'{entries,3,toCurrency}','"USD"'),
   jsonb_set(good,'{entries,3,amount}','10000'),
   jsonb_set(good,'{entries,0,price}','"NaN"'),
   jsonb_set(good,'{entries,0,date}','"2025-01-01"')
  )) loop
   begin
    perform restore_fixture.restore_atomic(a,l,s,bad,'{}');
    raise exception 'invalid ledger accepted';
   exception when invalid_parameter_value then null; end;
  end loop;
  for bad in select value from jsonb_array_elements(jsonb_build_array(
   '{"bad":[{"name":"bad","trades":[{"side":"buy","ticker":"TSLA","quantity":-1,"price":10}]}]}'::jsonb,
   '{"bad":[{"name":"bad","trades":[],"targetCash":-1}]}'::jsonb,
   '{"bad":[{"name":"bad","trades":[]},{"name":"bad","trades":[]}]}'::jsonb,
   '{"bad":[{"name":"bad","trades":[],"terminalPrices":{"TSLA":-1}}]}'::jsonb,
   '{"bad":[{"name":"bad","trades":[],"forecastPrices":{"TSLA":1}}]}'::jsonb,
   '{"bad":[{"name":"bad","trades":[{"side":"buy","ticker":"TSLA","quantity":1,"price":10,"priceBasis":"invalid"}]}]}'::jsonb
  )) loop
   begin
    perform restore_fixture.restore_atomic(a,l,s,good,bad);
    raise exception 'invalid strategy accepted';
   exception when invalid_parameter_value then null; end;
  end loop;
  select jsonb_build_object('payload',payload,'updated_at',updated_at) into changed from restore_fixture.ledger where user_id=a;
  if changed is distinct from l then raise exception 'domain rejection changed ledger'; end if;
  select jsonb_object_agg(name,jsonb_build_object('strategies',strategies,'updated_at',updated_at)) into changed from restore_fixture.strategies where user_id=a;
  if changed is distinct from s then raise exception 'domain rejection changed strategies'; end if;
  perform restore_fixture.restore_atomic(a,l,s,good,'{"valid":[{"name":"valid","targetCash":100,"terminalPrices":{"TSLA":200},"forecastPrices":{},"trades":[{"side":"sell","ticker":"TSLA","quantity":1,"price":150,"fee":0}]}]}');
  if (select payload from restore_fixture.ledger where user_id=a) is distinct from good then raise exception 'valid domain restore failed'; end if;
  raise notice 'DOMAIN_VALIDATION_OK: 10 invalid ledger and 6 invalid strategy requests rejected; valid chronological replay accepted';
 end;
 raise notice 'A: success, stale rejection, injected rollback, preserve and owner isolation passed';
end;
$test$;
select set_config('restore_fixture.uid','22222222-2222-4222-8222-222222222222',true);
do $test$
begin
 if (select count(*) from restore_fixture.ledger)<>1 or
    (select payload->'accounts'->0->>'id' from restore_fixture.ledger) is distinct from 'B'
    or (select count(*) from restore_fixture.strategies)<>1 then
  raise exception 'B data changed or A data leaked';
 end if;
 raise notice 'B: unchanged and isolated';
end;
$test$;
select set_config('restore_fixture.uid','',true);
do $test$
begin
 begin
  perform restore_fixture.restore_atomic('11111111-1111-4111-8111-111111111111',null,'{}',null,'{}');
  raise exception 'missing uid accepted';
 exception when insufficient_privilege then null; end;
end;
$test$;
reset role;
set local role anon;
do $test$
begin
 begin
  perform restore_fixture.restore_atomic('11111111-1111-4111-8111-111111111111',null,'{}',null,'{}');
  raise exception 'anon execute accepted';
 exception when insufficient_privilege then null; end;
 raise notice 'Anonymous execution rejected';
end;
$test$;
reset role;
rollback;
\echo ATOMIC_RESTORE_FIXTURE_OK
