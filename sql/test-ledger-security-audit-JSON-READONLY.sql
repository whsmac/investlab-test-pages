-- INVESTLAB TEST ONLY / READ-ONLY. Run only after verifying project ID gopofxyezhwpfxbecrxd.
-- One JSON result row; no DDL/DML, no user data, no secrets.
with expected(name) as (values
 ('investlab_accounts'),('investlab_ledger_events'),('investlab_ledger_legs'),
 ('investlab_personal_symbols'),('investlab_personal_scenarios_v2')
), t as (
 select e.name,c.oid,c.relrowsecurity,c.relforcerowsecurity
 from expected e left join pg_namespace n on n.nspname='public'
 left join pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind in ('r','p')
), table_audit as (
 select t.name as table_name,(t.oid is not null) as "exists",
 t.relrowsecurity as rls_enabled,t.relforcerowsecurity as force_rls,
 (select count(*)::int from pg_policy p where p.polrelid=t.oid) as policy_count,
 case when t.oid is not null then has_table_privilege('authenticated',t.oid,'INSERT') end as auth_insert,
 case when t.oid is not null then has_table_privilege('authenticated',t.oid,'UPDATE') end as auth_update,
 case when t.oid is not null then has_table_privilege('authenticated',t.oid,'DELETE') end as auth_delete,
 case when t.oid is not null then has_table_privilege('anon',t.oid,'SELECT') end as anon_select
 from t
), function_audit as (
 select n.nspname as schema_name,p.proname as function_name,
 pg_get_function_identity_arguments(p.oid) as arguments,
 p.prosecdef as security_definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 p.proconfig as settings
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='investlab_post_trade_v0'
)
select jsonb_build_object(
 'format','INVESTLAB_LEDGER_SECURITY_AUDIT_V1',
 'version',1,
 'scope','TEST_READ_ONLY_CATALOG',
 'tables',(select coalesce(jsonb_agg(to_jsonb(x) order by x.table_name),'[]'::jsonb) from table_audit x),
 'functions',(select coalesce(jsonb_agg(to_jsonb(f) order by f.function_name),'[]'::jsonb) from function_audit f),
 'warning','Catalog metadata only: A/B user isolation and rollback remain unverified.'
) as audit_json;
