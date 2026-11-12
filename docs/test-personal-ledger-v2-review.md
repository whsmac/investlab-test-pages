# TEST 개인 데이터 v2 — 미설치 후보안

## 근거
2026-11-12 사용자가 실행한 읽기 전용 SQL 결과: 공유 테이블 3개 존재/RLS 활성/각 정책 2개, 기존 초안 개인 테이블 4개 부재. 신규 v2 테이블의 부재는 아직 직접 검증하지 않았음.

## 변경점
- 계좌 `investlab_accounts`와 사용자 ID 복합 FK로 소유권 연결
- `investlab_ledger_events`(이벤트) + `investlab_ledger_legs`(현금·증권 증감)로 한 거래의 다중 자산 이동 표현
- `investlab_personal_symbols`: 관심·거래이력 종목
- `investlab_personal_scenarios_v2`: 시나리오 저장(256 KiB 제한)
- 원장에 거래가 기록되면 별도 잔고를 직접 수정하는 대신 확정 leg를 합산해 현금·보유수량 계산

## 예시 (아직 실제 INSERT 금지)
TSLA 10주를 $500에 매도, 수수료 $0인 경우 동일 event_id에:
- security TSLA: quantity_delta=-10
- cash USD: quantity_delta=+5000
환전의 경우 USD 음수 leg와 KRW 양수 leg를 하나의 이벤트에 묶는다.

## 중요한 미완료 게이트
1. TEST 프로젝트 ID 확인 및 동일 테이블명 존재 여부 확인
2. auth.uid() A/B/anon 실계정 접근 테스트. SQL Editor 관리자 역할로는 RLS 검증 불가
3. UPDATE로 user_id를 바꾸는 시도, 계좌 교차 참조, event_id 교차 참조 차단 테스트
4. 원장 이벤트와 legs를 원자적으로 기록하는 RPC 및 금액/수량 일치 검증
5. 확정 원장의 수정·삭제 금지, 정정/역거래, 동시성/중복 요청 처리
6. 기초 보유분 이관 및 취득원가 lot 관리, 매수·매도 수수료/환율 세금 모델
7. RLS 권한/인덱스/롤백/백업 검증, 사용자별 기기 간 동기화 테스트

**중요**: 이 SQL은 안전하게 실행할 준비가 된 최종 마이그레이션이 아닙니다. 특히 이벤트/legs 직접 쓰기와 수정/삭제가 허용되어 있으므로 실거래 원장 저장에 사용하면 안 됩니다. 실행 전에 별도 최종 마이그레이션으로 보완해야 합니다. 이전 DRAFT SQL도 실행하지 마세요.

운영 DB, 기존 PR, 원본 로컬 포트폴리오 변경 없음.
