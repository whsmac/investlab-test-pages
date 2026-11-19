-- INVESTLAB TEST: 개인 데이터 격리 사전점검 (읽기 전용)
-- 대상: TEST Supabase SQL Editor에서만 실행. 운영 프로젝트에 실행 금지.
-- 이 SQL은 테이블/정책/권한 메타데이터만 조회합니다.
-- CREATE/ALTER/INSERT/UPDATE/DELETE/GRANT/REVOKE를 실행하지 않습니다.
-- 주의: 정책 표현식에는 스키마/컬럼명이 포함될 수 있습니다. 결과를 외부에 공유할 때 검토하세요.

-- 1. 개인 데이터 후보 테이블과 RLS 상태
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       c.relkind as object_kind
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p','v')
order by c.relname;

-- 2. RLS 정책 정의: USING / WITH CHECK와 적용 역할 확인
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. 인증된 사용자 역할의 테이블 권한 (RLS 통과를 보장하지 않음)
select table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'authenticated'
order by table_name, privilege_type;

-- 4. 후보 테이블의 사용자 소유권 컬럼 구조 (실제 사용자 데이터 조회 없음)
select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (column_name in ('user_id','owner_id','account_id','created_by')
       or table_name ~* '(portfolio|holding|ledger|account|trade|scenario|strategy)')
order by table_name, ordinal_position;

-- 판정 원칙:
-- (A) RLS enabled만으로 사용자 격리를 인정하지 않습니다.
-- (B) 정책에 auth.uid() 또는 동등한 소유권 검증이 실제로 적용되는지 검토합니다.
-- (C) SELECT와 INSERT/UPDATE/DELETE는 각각 독립 검증합니다.
-- (D) 서로 다른 TEST 사용자 두 계정의 실제 접근 결과가 확인되기 전까지
--     개인 데이터 쓰기 및 기기 간 동기화 기능을 활성화하지 않습니다.

-- 5. 개인 데이터 후보 테이블의 구조적 위험 신호 요약
-- 이 결과는 검토 우선순위이며 실제 사용자 간 격리 성공 판정이 아닙니다.
-- 뷰는 테이블 RLS 검사만으로 보호 여부를 판단할 수 없어 별도 확인 대상으로 표시합니다.
with candidate as (
  select n.nspname, c.relname, c.relkind, c.relrowsecurity,
         c.oid as relation_oid
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r','p','v')
    and c.relname ~* '(portfolio|holding|ledger|account|trade|scenario|strategy)'
), policy_count as (
  select schemaname, tablename,
         count(*) as total_policies,
         count(*) filter (where cmd in ('SELECT','ALL')) as read_policies,
         count(*) filter (where cmd in ('INSERT','UPDATE','ALL')) as write_policies
  from pg_catalog.pg_policies
  where schemaname = 'public'
  group by schemaname, tablename
)
select c.nspname as schema_name, c.relname as object_name,
       case when c.relkind = 'v' then 'VIEW_REQUIRES_SEPARATE_REVIEW'
            when not c.relrowsecurity then 'RLS_DISABLED_REVIEW_REQUIRED'
            when coalesce(p.total_policies,0) = 0 then 'NO_POLICIES_REVIEW_REQUIRED'
            else 'POLICIES_PRESENT_MANUAL_REVIEW_REQUIRED' end as review_status,
       c.relrowsecurity as rls_enabled,
       coalesce(p.total_policies,0) as policy_count,
       coalesce(p.read_policies,0) as read_policy_count,
       coalesce(p.write_policies,0) as write_policy_count,
       pg_catalog.has_table_privilege('authenticated',c.relation_oid,'SELECT') as authenticated_select_grant,
       pg_catalog.has_table_privilege('authenticated',c.relation_oid,'INSERT') as authenticated_insert_grant,
       pg_catalog.has_table_privilege('authenticated',c.relation_oid,'UPDATE') as authenticated_update_grant,
       pg_catalog.has_table_privilege('authenticated',c.relation_oid,'DELETE') as authenticated_delete_grant
from candidate c
left join policy_count p on p.schemaname = c.nspname and p.tablename = c.relname
order by c.relname;

-- 참고: authenticated 역할의 권한이 있더라도 정책 USING/WITH CHECK,
-- 뷰의 security_invoker 및 소유자 실행 문맥에 따라 실제 접근 범위가 달라집니다.
-- 특히 VIEW_REQUIRES_SEPARATE_REVIEW 항목은 안전하다고 간주하지 않습니다.
