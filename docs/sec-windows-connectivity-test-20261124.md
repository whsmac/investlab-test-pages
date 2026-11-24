# SEC Company Facts — Windows 회사 PC 접속 테스트 (읽기 전용)

GitHub Actions에서 발생한 HTTP 403과 회사 PC의 일반 브라우저 접속 성공을 비교하는 **진단 전용** 단계입니다. 이번 단계는 6개 기업 재무자료를 수집하거나 Pilot을 배포하지 않으며, Tesla/MSFT에 대해 단 **2회 GET** 요청으로 자동화 접근 가능성만 확인합니다.

## 실행 (Windows PowerShell)

1. GitHub `scripts/test_sec_windows_readonly.ps1` 코드를 확인합니다.
2. 회사 PC에서 **Windows PowerShell**을 엽니다(관리자 권한 불필요).
3. 아래 명령으로 GitHub TEST 브랜치에 있는 스크립트를 임시 파일로 받습니다.

```powershell
Invoke-WebRequest "https://raw.githubusercontent.com/whsmac/investlab-test-pages/feature/sec-windows-readonly-connectivity-20261124/scripts/test_sec_windows_readonly.ps1" -OutFile "$env:TEMP\investlab-sec-test.ps1"
```

4. 코드를 열어 확인한 다음 실행합니다.

```powershell
notepad "$env:TEMP\investlab-sec-test.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\investlab-sec-test.ps1"
```

이 실행 정책은 해당 단일 PowerShell 프로세스에만 적용됩니다. 회사의 보안 정책상 스크립트 실행이 금지되어 있다면 정책을 우회하지 말고 테스트를 중단하세요. 이 경우 집 Mac mini에서 별도 검증을 진행합니다.

5. 스크립트가 물어보면 `INVESTLAB Research 본인의실제이메일` 형식을 **PC 콘솔에만** 입력합니다. GitHub Secret이나 이메일을 ChatGPT 대화창에 입력하지 마세요. 입력한 값은 프로그램 메모리에서만 사용하며 파일에 저장되지 않습니다.
6. 아래처럼 **개인정보 없는 진단 결과 두 줄과 최종 상태만** 공유합니다.

```text
TSLA: PASS | HTTP 200 | CIK True | US-GAAP tags ...
MSFT: PASS | HTTP 200 | CIK True | US-GAAP tags ...
RESULT: BOTH_PASS
```

HTTP 403/429 또는 NETWORK_OR_TLS_ERROR가 나오는 경우에도 그대로 알려주세요. 원본 오류 전문과 콘솔의 이메일 입력값은 공유하지 마세요.

## 결과 해석

- 둘 다 PASS: 회사 Windows PowerShell에서도 SEC 자동화 요청이 허용됨. 다음 단계에서 기존 Python 수집기의 SEC 공식 Company Facts 자료를 로컬 파일로 검증할 수 있음. GitHub Pages 게시 방식은 별도 안전성 검토 필요
- HTTP 403: 회사 네트워크 또는 PowerShell 요청 방식이 SEC에 차단될 수 있음. 휴대폰/브라우저 성공과 다를 수 있음
- HTTP 429: 공시 서버의 요청 빈도 제한. 반복 재시도를 중지
- NETWORK_OR_TLS_ERROR: 회사 네트워크/프록시/SSL 문제 가능성. 이 두 줄만으로 원인을 확정하지 않음

**안전 경계**: GitHub PR 미병합, 운영 및 TEST Supabase 변경 없음, 계좌 정보/실제 거래 데이터 읽기·쓰기 없음, 개인정보 로그 없음, 수집 결과 GitHub 업로드 없음. **HTTP 200만으로 6개 기업의 분기 실적 정확성/전체 수집을 보장하지는 않습니다.**
