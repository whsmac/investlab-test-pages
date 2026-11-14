-- INVESTLAB TEST personal data preflight: READ ONLY
-- Run ONLY after confirming the SQL Editor is connected to TEST project.
-- This script contains SELECT statements only. No schema or data changes.
select current_database() as database_name, current_user as executing_role,
       current_setting('server_version') as postgres_version;
select table_schema, table_name, table_type
from information_schema.tables
where table_schema='public'
  and (table_name like 'investlab_personal_%'
       or table_name in ('companies','market_price_observations','quarterly_financial_observations'))
order by table_name;
select c.relname as table_name,c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
  and (c.relname like 'investlab_personal_%'
       or c.relname in ('companies','market_price_observations','quarterly_financial_observations'))
order by c.relname;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies
where schemaname='public'
  and (tablename like 'investlab_personal_%'
       or tablename in ('companies','market_price_observations','quarterly_financial_observations'))
order by tablename,policyname;
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name like 'investlab_personal_%'
order by table_name,ordinal_position;
select table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name like 'investlab_personal_%'
order by table_name,grantee,privilege_type;
-- Do not infer that SQL Editor execution tests authenticated/anon RLS:
-- SQL Editor often runs with an elevated database role.
