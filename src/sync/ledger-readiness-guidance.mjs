import {reviewLedgerReadiness} from './ledger-readiness-review.mjs';
// Pure local diagnostics. Recommendations are informational; never modify the ledger.
const guidance={
 '원장 구조':'원장 JSON의 최상위 구조와 배열 섹션을 확인하세요.',
 '거래 값 형식':'거래 금액은 쉼표 없는 숫자로, 거래일은 YYYY-MM-DD로 확인하세요. 원본 데이터는 자동 수정하지 않습니다.',
 'DB 컬럼 매핑':'DB 컬럼 JSON이 있다면 선택하여 이름 일치 후보를 확인하세요. 미매칭 컬럼을 임의로 채우지 마세요.',
 'DB 실측 컬럼 검증':'TEST Supabase에서 실제 컬럼 조회가 가능해질 때 확인하세요. 지금 SQL 재실행은 필수가 아닙니다.',
 '사용자별 접근 격리':'두 개의 TEST 사용자 계정으로 접근 격리 검증 전까지 저장을 활성화하지 마세요.'
};
export function reviewLedgerWithGuidance(ledger,options={}){
 const review=reviewLedgerReadiness(ledger,options);
 const actions=review.checks.map(check=>({name:check.name,status:check.status,detail:check.detail,action:guidance[check.name],needsAttention:!['REVIEWED','CHECKED_LIMITED'].includes(check.status)}));
 const examples=(review.values?.issues??[]).slice(0,20).map(issue=>({row:issue.row,field:issue.field,reason:issue.reason,action:issue.reason.includes('날짜')?'실제 달력에 존재하는 YYYY-MM-DD 날짜인지 확인하세요.':'쉼표와 통화기호를 제거한 숫자 원본인지 확인하세요. 원본은 자동 변경하지 않습니다.'}));
 return {actions,examples,hiddenIssueCount:Math.max(0,(review.values?.issueCount??0)-examples.length),readyForServerWrite:false,canPost:false,canSync:false,mode:'OFFLINE_GUIDANCE_ONLY'};
}
