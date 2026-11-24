# INVESTLAB 1단계 — Mac mini SEC 공식 Company Facts 접근 테스트

범위: TEST 저장소에서 연결성 진단만 수행. DB, GitHub Pages, 다른 Draft PR, 계좌·원장·가상거래 전략에 **쓰기 없음**.

## 테스트 방법 (집 Mac mini)

1. Terminal을 열고 이 기능 브랜치를 **별도 폴더**에 받습니다. 기존 작업 폴더 또는 실제 투자자료를 덮어쓰지 마세요.

```bash
git clone --branch feature/pilot-sec-mac-readonly-preflight-20261124 --single-branch https://github.com/whsmac/investlab-test-pages.git ~/Desktop/investlab-sec-preflight
cd ~/Desktop/investlab-sec-preflight
python3 scripts/sec_mac_connection_probe.py
```

2. 프로그램은 **터미널 화면에 표시되지 않는 방식**으로 SEC 식별 명칭 + 연락 가능한 이메일을 묻습니다. GitHub Secret과 같은 형식의 실제 연락처를 입력하세요. 정확한 값은 채팅, PR, 로그에 붙여 넣지 마세요. 로그인 비밀번호나 Supabase API 키는 필요 없습니다.
3. 기본 시험은 TSLA 한 종목만 조회합니다. 필요하면 `python3 scripts/sec_mac_connection_probe.py --all`로 MSFT, GOOGL, AMZN, META, TSLA, SPCX 여섯 기업에 각각 1초 간격으로 요청합니다.
4. 채팅에는 종목별 상태 코드(예: `TSLA: HTTP_200_CIK_FACTS_OK`, `TSLA: HTTP_403`)만 알려주세요.

## 판정

- `HTTP_200_CIK_FACTS_OK`: Mac mini Python 요청이 공식 SEC CIK·XBRL JSON 검증을 통과. **분기별 금융 숫자의 정확성을 보증하는 단계는 아닙니다.**
- `HTTP_403` / `HTTP_429`: 접근 제한. 반복 호출, 프록시/우회 접속 시도는 하지 마세요.
- `DNS_ERROR`, `TIMEOUT`, `TLS_ERROR`, `NETWORK_ERROR`: Mac 네트워크·TLS 연결 진단이 우선.
- `BODY_TOO_LARGE`, `CIK_MISMATCH`, `INVALID_JSON`: 자료 크기·CIK·JSON 검증 실패이므로 게시 금지.

SEC의 공개 Company Facts API에는 XBRL 숫자가 있으며, 공식 정책에 따라 식별 가능한 User-Agent와 요청 빈도(10회/초 이하)를 준수합니다. GitHub Actions에서 HTTP 403이면 Mac mini 성공 여부를 먼저 확인한 뒤, 기존 `sec_quarterly_financials_test.py`로 6개 기업 **예비값**을 생성·검증하고, 계좌·원장과 분리된 공개 TEST 데이터만 게시하는 파이프라인을 계획합니다. 금액은 기업별 회계 분기 및 공시 원문 대조 전에 확정치로 표시하면 안 됩니다.

현재는 진단만 추가했으며 **자동 수집 스케줄, Supabase 수정, 배포 변경, 데이터 게시 없음**. 실제 Mac 실행 및 분기 공시 품질 검사 통과 후 후속 Draft PR에서 게시 경로를 결정합니다.
