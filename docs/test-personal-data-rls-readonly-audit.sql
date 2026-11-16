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
