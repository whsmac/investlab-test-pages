# INVESTLAB TEST — 원장 중심 정합성 및 마이그레이션 게이트

상태: 설계 검토 전용. Supabase 실행 없음.

## 확인된 현재 상태
- 공유 기업 데이터: 기업 6, 주가 4,938, 분기 재무 0 (사용자 화면 검증)
- 브라우저 로컬 키: `investlab_holdings`, `investlab_watchlist`, `investlab_past_symbols`
- 서로 다른 origin 간 localStorage 자동 공유 불가
- 개인 데이터 테이블은 초안일 뿐, 설치 여부 미확인

## 권장 데이터 원천
1. 계좌(account)는 사용자별 소유권을 가지며 account_id(UUID)로 식별한다.
2. 거래원장(ledger)은 실제 매수/매도, 입출금, 환전, 배당, 수수료의 단일 기록 원천이다.
3. 보유수량과 현금잔고는 원장의 확정 거래에서 계산한다. 기존 보유분을 이관할 때는 별도 opening-balance 이벤트와 취득원가 근거를 둔다.
4. 시뮬레이터는 원장을 변경하지 않는다. 계산 결과와 가정 거래는 별도 시나리오에 저장한다.
5. 관심종목과 거래이력 종목은 계정별 관리 테이블을 별도로 설계한다.

## 최소 원장 이벤트 모델 (차기 버전)
- id, user_id, account_id, occurred_at, event_type, ticker, quantity, unit_price, gross_amount, fee_amount, currency, fx_rate, external_id, memo, created_at
- FX: 출금 통화/금액, 입금 통화/금액, 수수료를 한 거래 그룹으로 묶고 순합계 0의 회계적 정합성 점검
- 계좌간 이체: 양쪽 계좌를 동일 transaction_group_id로 묶는다
- 중복 방지: user_id + source + external_id 유니크 (external_id가 있는 경우)
- 수정/삭제: 확정 거래는 원본을 덮어쓰지 않고 역거래/정정 이벤트를 권장
- 원자성: 단일 DB 트랜잭션 내 원장 입력과 검증, 충돌 시 전부 롤백
- 취득원가·세금: 거래별 환율/수수료 및 취득 lot 이력 보존, 신고용 계산은 별도 검증

## 예시 불변식
- 종목 보유수량 = 기초잔고 + SUM(buy.quantity) - SUM(sell.quantity) + 확정 조정
- USD 현금 = 기초 USD + 입금 + 매도 순유입 + 배당 - 매수 총지출 - 출금 + 환전 순유입/유출
- 실제 거래 입력 1회로 화면의 포트폴리오, 현금, 원장이 동일한 확정 이벤트를 참조
- 사용자 A는 사용자 B의 계좌, 원장, 시나리오를 읽거나 변경할 수 없음

## 기존 DRAFT SQL의 적용 보류 사유
- `create table if not exists`는 기존 테이블의 컬럼/제약을 검증하지 않음
- 정책 생성은 재실행 시 이름 충돌 가능
- 계좌키가 단순 문자열이라 별도 계좌 소유권 검증이 부족
- 현금 잔고 테이블과 원장을 각각 쓰면 불일치 위험
- 이벤트 타입 `fx` 하나만으로 양 통화 흐름을 표현하기 부족
- 사용자 ID 변경 금지, JSON 크기 제한, 동시 수정 충돌 정책 보완 필요

## 실행 전 게이트
1. `sql/test-personal-preflight-READONLY.sql`을 TEST 프로젝트에서만 실행하고 결과 검토
2. 기존 스키마/정책/GRANT 중복 및 이름 충돌 확인
3. 수정된 신규 마이그레이션을 별도 작성, 실제 적용 전 백업/롤백 계획 확보
4. TEST Auth 사용자 A/B와 anon 각각으로 PostgREST 요청 검증 (SQL Editor 관리자 실행만으로는 RLS 검증 불가)
5. 성공 후에만 기존 포트폴리오 데이터의 명시적 사용자 승인 기반 이관을 구현

운영 Supabase, 원본 포트폴리오, 기존 PR은 변경하지 않는다.
