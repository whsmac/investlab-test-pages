-- READ-ONLY TEST preflight queries. Do not run against production.
-- This file performs SELECT only. It does not create, alter, insert, update or delete.
-- Verify the SQL editor is connected to the intended TEST project before running.
select current_database() as database_name, current_user as connected_role;
select to_regclass('public.test_user_scenarios') as existing_scenario_table;
select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='test_user_scenarios';
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename='test_user_scenarios'
order by policyname;
select table_schema,table_name,column_name,data_type,is_nullable
from information_schema.columns where table_schema='public' and table_name='test_user_scenarios'
order by ordinal_position;
select grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='test_user_scenarios'
order by grantee,privilege_type;
-- Do not copy access tokens, JWTs, or user identifiers into the report.
