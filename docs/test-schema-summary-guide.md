# TEST DB 점검 — 한 번 실행하고 결과 전달

1. Supabase Dashboard에서 프로젝트 ID `gopofxyezhwpfxbecrxd`인지 확인합니다.
2. SQL Editor에서 `sql/test-schema-summary-READONLY.sql` 전체를 붙여 넣고 **Run** 합니다.
3. 출력되는 7행의 결과를 스크린샷으로 공유합니다. 비밀번호·키·사용자별 보유내역은 보내지 않습니다.
4. 결과를 확인하기 전에는 `test-personal-data-isolation-DRAFT.sql`을 실행하지 않습니다.

### 결과 해석
- `table_exists=false`: 해당 테이블은 아직 없음
- `rls_enabled=true`: RLS 활성화됨 (정책이 안전하다는 뜻은 아님)
- `policy_count`: 정책 개수, 정책 내용과 권한은 별도 검토 필요
- `anon_can_select`, `authenticated_can_select`: 테이블 수준 권한만 표시, 실제 행 접근 여부와 다름

### 범위
SQL은 읽기 전용이며 스키마나 데이터를 수정하지 않습니다. 실행 대상이 TEST인지 확인하는 것은 사용자 몫입니다. SQL Editor에서 DB 프로젝트 ID를 신뢰성 있게 자동 확인할 수 없으므로 Dashboard 상단의 프로젝트 ID를 먼저 확인해야 합니다.
