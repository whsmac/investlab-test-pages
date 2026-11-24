# INVESTLAB 1단계 Pilot — SEC 분기 재무자료 자동수집 점검 (2026-11-24)

**범위:** TEST GitHub Pages의 6개 기업 분석 화면 중 SEC에서 확인 가능한 미국 공시기업 5개(MSFT, GOOGL, AMZN, META, TSLA)의 과거 분기 매출·CAPEX·영업이익·영업이익률. 여섯 번째 `SPCX`는 확인된 SEC CIK/공식 XBRL 매핑이 없으므로 수치를 임의로 만들지 않습니다.

## 1. 현재 상태

- Yahoo Finance 기업 종가, NASDAQ 100/S&P 500, 시장 동향 데이터는 TEST Pages 무료 공개 데이터 자동수집을 사용합니다.
- 분기 재무자료는 TEST 원장에 이전에 저장한 관측값을 우선 사용하고, 추가로 공식 SEC Company Facts의 예비값을 읽도록 구현되어 있습니다.
- 2026-11-23 TEST Pages 배포 기록에서는 SEC 수집 단계가 **`INVESTLAB_SEC_USER_AGENT` 미설정으로 건너뛰어졌습니다.** 따라서 SEC 자동수집을 완료했다고 주장할 수 없습니다.
- 개인 계좌·거래 데이터, Supabase 테이블 및 운영 대시보드는 **변경하거나 이관하지 않습니다.**

## 2. GitHub Secret으로 올바른 SEC 식별정보 설정 (사용자 작업 1회)

SEC는 자동화된 접속에 서비스/조직명과 실제 연락 가능한 이메일을 포함한 `User-Agent`를 요구합니다. 개인 연락처를 PR, 소스 파일, 공개 TEST 화면, 이 대화의 일반 메시지에 넣지 마세요.

1. GitHub의 **`whsmac/investlab-test-pages`** 저장소를 엽니다.
2. **Settings → Secrets and variables → Actions → New repository secret**으로 이동합니다.
3. 이름은 정확히 **`INVESTLAB_SEC_USER_AGENT`** 입니다.
4. 값은 **`INVESTLAB Research 본인의실제이메일주소`**와 같이 식별 가능한 명칭 + 실제 연락받을 이메일로 지정합니다. 예시 도메인/가짜 연락처는 허용하지 않습니다.
5. 저장 후 **Actions → TEST Yahoo auto prices to GitHub Pages (TEST ONLY) → Run workflow**를 기본 `main`에서 실행합니다.
6. 성공 여부는 Actions 작업의 **SEC preliminary quarterly coverage** 요약을 확인합니다. 수집 결과는 **예비 공시 자료**이며 기업별 보고서의 정의·CAPEX 분류와 최종 대조하기 전에는 확정치라고 표시하지 않습니다.

이 GitHub Secret은 자동수집의 서버 측 요청 헤더에만 사용됩니다. 공개 HTML/JSON 및 Actions 요약에는 이름이나 이메일을 출력하지 않습니다. 이 값은 Supabase 인증키도, 유료 API 키도 아닙니다.

## 3. 검증 기준

- [ ] 5개 공시기업 각각 SEC 접근·수집 성공 (SPCX는 별도 공식 소스 확인 전 제외)
- [ ] 기업별 분기 날짜, 회계연도/분기, 재무단위 USD 십억 기준 확인
- [ ] 3년·5년 조회 구간 분기수 자동 요약; 부족한 데이터는 그대로 **미확보** 처리
- [ ] 매출액·CAPEX·영업이익·영업이익률 값의 결측/부호 검증
- [ ] Microsoft의 회계분기와 달력분기 차이 반영
- [ ] 전분기·전년동기 지표는 이전 공시값이 있을 때만 계산
- [ ] 테스트용 수집·배포 단계에서 DB 쓰기 0회 유지

## 4. 별도 사용자 최종 Pilot 검수

PC와 모바일에서 **동일 TEST 계정**으로 계좌·거래·시뮬레이션 저장/불러오기, 기기 간 동기화, 금액·환율과 원장 일치 여부를 확인해야 합니다. 추가 TEST 사용자가 있다면 계정 간 자료가 섞이지 않는지도 검증해야 합니다. 로그인 비밀번호나 사용자 금융정보를 GitHub 테스트 코드에 넣으면 안 됩니다.
