// TEST-only offline evaluator. Does not connect to Supabase or authenticate users.
export const ISOLATION_CASES=Object.freeze([
 {id:'a_own_read',label:'A 계정은 A 본인 자료 조회 가능',expected:'ALLOW'},
 {id:'a_other_read',label:'A 계정은 B 자료 조회 불가',expected:'DENY'},
 {id:'b_own_read',label:'B 계정은 B 본인 자료 조회 가능',expected:'ALLOW'},
 {id:'b_other_read',label:'B 계정은 A 자료 조회 불가',expected:'DENY'},
 {id:'anon_read',label:'익명 계정은 개인 자료 조회 불가',expected:'DENY'},
 {id:'a_other_write',label:'A 계정은 B 자료 수정·삭제 불가',expected:'DENY'},
 {id:'b_other_write',label:'B 계정은 A 자료 수정·삭제 불가',expected:'DENY'},
 {id:'anon_rpc',label:'익명 계정은 거래 RPC 실행 불가',expected:'DENY'}
]);
export function assessIsolationEvidence(evidence={}){
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw Error('invalid evidence');
 const cases=ISOLATION_CASES.map(c=>{const actual=evidence[c.id];const status=actual==='ALLOW'||actual==='DENY'?(actual===c.expected?'PASS':'FAIL'):'UNVERIFIED';return {...c,actual:actual??null,status}});
 const failures=cases.filter(c=>c.status==='FAIL').map(c=>c.id);
 const missing=cases.filter(c=>c.status==='UNVERIFIED').map(c=>c.id);
 return {format:'INVESTLAB_TEST_ISOLATION_REVIEW_V1',status:failures.length?'FAILED':missing.length?'INCOMPLETE':'MANUAL_EVIDENCE_RECORDED',cases,failures,missing,
  serverVerified:false,canMigrate:false,canExecuteSql:false,authorization:'NONE',
  warning:'Manually entered observations are not authenticated proof. Real A/B/anon server tests require separate approval.'};
}
