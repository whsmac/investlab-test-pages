-- INVESTLAB TEST: compact schema inventory, READ ONLY
-- Verify the Supabase dashboard project is gopofxyezhwpfxbecrxd BEFORE running.
-- Returns one row per expected table. No credentials or personal rows are selected.
with expected(table_name, data_class) as (
 values
 ('companies','shared'),
 ('market_price_observations','shared'),
 ('quarterly_financial_observations','shared'),
 ('investlab_personal_holdings','personal_draft'),
 ('investlab_personal_cash','personal_draft'),
 ('investlab_personal_ledger','personal_draft'),
 ('investlab_personal_scenarios','personal_draft')
), inventory as (
 select e.table_name,e.data_class,c.oid as relation_oid,
        coalesce(c.relrowsecurity,false) as rls_enabled,
        coalesce(c.relforcerowsecurity,false) as rls_forced
 from expected e
 left join pg_namespace n on n.nspname='public'
 left join pg_class c on c.relnamespace=n.oid and c.relname=e.table_name and c.relkind in ('r','p')
)
select i.table_name,i.data_class,
       (i.relation_oid is not null) as table_exists,
       case when i.relation_oid is null then null else i.rls_enabled end as rls_enabled,
       case when i.relation_oid is null then null else i.rls_forced end as rls_forced,
       (select count(*) from pg_policy p where p.polrelid=i.relation_oid) as policy_count,
       case when i.relation_oid is null then null else has_table_privilege('anon',i.relation_oid,'SELECT') end as anon_can_select,
       case when i.relation_oid is null then null else has_table_privilege('authenticated',i.relation_oid,'SELECT') end as authenticated_can_select
from inventory i order by case i.data_class when 'shared' then 0 else 1 end,i.table_name;
-- Notes: role privilege booleans are NOT proof of row-level visibility.
-- SQL Editor often runs with elevated rights; test RLS via separate user sessions.
