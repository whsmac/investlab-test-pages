// TEST-only scenario storage normalization. Keep hypothetical steps; do not copy
// real holdings/cash into independently persisted scenario documents.
import {reviewPersonalStorageDuplicates} from './personal-storage-dedup-policy.mjs';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function prepareTestScenarioDocument(input,{sourceLedgerRevision=null,sourceSnapshotId=null}={}){
 if(!plain(input))throw Error('전략 입력 형식 오류');
 const allowed=['name','description','steps','assumptions','targetPrices','createdAt','updatedAt'];
 const candidate={};
 for(const key of allowed)if(Object.hasOwn(input,key))candidate[key]=input[key];
 if(sourceLedgerRevision!==null)candidate.sourceLedgerRevision=sourceLedgerRevision;
 if(sourceSnapshotId!==null)candidate.sourceSnapshotId=sourceSnapshotId;
 const report=reviewPersonalStorageDuplicates('scenario',candidate);
 if(report.rejected.length)throw Error('전략 필드 검증 실패');
 if(typeof candidate.name!=='string'||!candidate.name.trim()||candidate.name.length>120)throw Error('전략 이름 필요');
 if(!Array.isArray(candidate.steps)||candidate.steps.length>500)throw Error('가상 거래 단계 형식 오류');
 for(const [i,step] of candidate.steps.entries()){
  if(!plain(step))throw Error('가상 거래 단계 '+(i+1)+' 형식 오류');
  const type=String(step.type||step.side||'').toUpperCase();
  if(!['BUY','SELL'].includes(type))throw Error('가상 거래 단계 '+(i+1)+' 매매 유형 오류');
 }
 // Never silently migrate legacy saved scenarios; explicit opt-in required.
 const omitted=Object.keys(input).filter(key=>!allowed.includes(key));
 return {kind:'scenario',payload:report.kept,omittedLegacyFields:omitted,
  requiresReview:omitted.length>0,canPost:false,canOverwrite:false,canDelete:false,
  baselineSource:sourceLedgerRevision!==null||sourceSnapshotId!==null?'LEDGER_REFERENCE':'UNVERIFIED',
  note:'가상 거래 단계는 보관하되 실제 보유종목·현금·원장 거래의 중복 복사본은 만들지 않습니다. 기존 전략 저장소는 변경하지 않습니다.'};
}
