import {inspectLedgerShape} from './ledger-shape-inventory.mjs';
import {inspectLedgerTransactionValues} from './ledger-value-preflight.mjs';
import {previewLedgerColumnMapping} from './ledger-column-mapping.mjs';
// Local-only consolidated readiness report. It must never authorize writes.
export function reviewLedgerReadiness(ledger,{columns=null,section='transactions'}={}){
 const shape=inspectLedgerShape(ledger);
 const hasSection=Array.isArray(ledger[section]);
 const values=hasSection?inspectLedgerTransactionValues(ledger,{section}):null;
 let mapping=null,mappingError=null;
 if(columns!==null){try{mapping=previewLedgerColumnMapping(ledger,columns,{section});}catch(error){mappingError=error.message;}}
 const checks=[
  {name:'원장 구조',status:'REVIEWED',detail:shape.sections.length+'개 섹션 · '+shape.sourceRows+'개 배열 항목'},
  {name:'거래 값 형식',status:!values?'BLOCKED':values.issueCount?'REVIEW_REQUIRED':'CHECKED_LIMITED',detail:!values?'거래 배열 없음':values.rows+'건 검사 · 형식 확인 필요 '+values.issueCount+'건'},
  {name:'DB 컬럼 매핑',status:mappingError?'REVIEW_REQUIRED':mapping?'CANDIDATE_ONLY':'NOT_CHECKED',detail:mappingError||(!mapping?'컬럼 JSON 미제공':mapping.mapped.filter(x=>x.sourceField).length+'/'+mapping.mapped.length+'개 이름 일치')},
  {name:'DB 실측 컬럼 검증',status:'NOT_VERIFIED',detail:'SQL Editor 결과와 서버 출처 미검증'},
  {name:'사용자별 접근 격리',status:'NOT_VERIFIED',detail:'두 계정 간 실제 격리 테스트 미실시'}
 ];
 return {checks,shape,values,mapping,mappingError,readyForServerWrite:false,canPost:false,canSync:false,mode:'OFFLINE_REVIEW_ONLY'};
}
