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
commit;
\echo CONCURRENCY_FIXTURE_READY
