// Review-only readiness: user checkboxes never prove server-side security.
export const TEST_PREFLIGHT_CHECKS=Object.freeze([
 {id:'reviewReport',label:'기초잔고 비교보고서 검토',kind:'manual'},
 {id:'targetVerified',label:'TEST 프로젝트 ID 및 URL 확인',kind:'manual'},
 {id:'schemaReviewed',label:'개인 원장 스키마와 권한 검토',kind:'manual'},
 {id:'rlsIsolationVerified',label:'A/B 사용자 및 익명 접근 RLS 실측',kind:'server'},
 {id:'atomicityVerified',label:'트랜잭션 원자성·실패 시 롤백 실측',kind:'server'},
 {id:'idempotencyVerified',label:'동일 요청 중복 이전 방지 실측',kind:'server'},
 {id:'recoveryVerified',label:'복구 및 백업 절차 실측',kind:'server'},
 {id:'reconciliationVerified',label:'이전 전후 계좌별 잔고 일치 실측',kind:'server'}
]);
export function assessTestMigrationPreflight(evidence={}){
 const checks=TEST_PREFLIGHT_CHECKS.map(c=>{const v=evidence[c.id];return {...c,status:v===true?'VERIFIED':v===false?'FAILED':'NOT_VERIFIED'}});
 const blockers=checks.filter(c=>c.status!=='VERIFIED').map(c=>c.id);
 return {status:blockers.length?'BLOCKED':'READY_FOR_SEPARATE_APPROVAL',checks,blockers,
  authorization:'NONE',canExecuteSql:false,canUpload:false,canMerge:false,
  note:'Checklist is a planning aid; user assertions alone are not evidence of actual TEST database verification.'};
}
