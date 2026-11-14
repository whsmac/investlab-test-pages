-- INVESTLAB TEST: read-only security audit for proposed personal ledger v2
-- Confirm TEST project before execution. SELECT only; safe when tables absent.
with expected(name) as (values
 ('investlab_accounts'),('investlab_ledger_events'),('investlab_ledger_legs'),
 ('investlab_personal_symbols'),('investlab_personal_scenarios_v2')
), tables as (
 select e.name,c.oid,c.relrowsecurity,c.relforcerowsecurity
 from expected e left join pg_namespace n on n.nspname='public'
 left join pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind in ('r','p')
)
select t.name as table_name,(t.oid is not null) as exists,
 case when t.oid is not null then t.relrowsecurity end as rls_enabled,
 case when t.oid is not null then t.relforcerowsecurity end as force_rls,
 (select count(*) from pg_policy p where p.polrelid=t.oid) as policy_count,
 case when t.oid is not null then has_table_privilege('authenticated',t.oid,'INSERT') end as auth_insert,
 case when t.oid is not null then has_table_privilege('authenticated',t.oid,'UPDATE') end as auth_update,
 case when t.oid is not null then has_table_privilege('authenticated',t.oid,'DELETE') end as auth_delete,
 case when t.oid is not null then has_table_privilege('anon',t.oid,'SELECT') end as anon_select
from tables t order by t.name;

-- Additional read-only check: functions named investlab_post_trade_v0, if present.
select n.nspname as schema_name,p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proowner::regrole as owner_role,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       p.proconfig as settings
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='investlab_post_trade_v0';
