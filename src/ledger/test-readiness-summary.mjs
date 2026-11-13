import {validateTestEvidenceFile} from './test-evidence-file.mjs';
import {validateFinalOpeningReviewFile} from './opening-final-review-file.mjs';
function checkFile(id,file,validate,readyStatus){
 if(file===null||file===undefined)return {id,status:'MISSING',detail:id==='OPENING'?'초기잔고 최종 점검 JSON 파일을 선택하세요':'종합 시험 증빙 JSON 파일을 선택하세요'};
 try{
  const value=validate(file);
  return {id,status:value.review?.status===readyStatus||value.summary?.status===readyStatus?'READY':'BLOCKED',detail:value.review?.status??value.summary?.status??'검토 상태 확인 필요',createdAt:value.createdAt??null};
 }catch(e){return {id,status:'INVALID',detail:'파일 형식 또는 내부 일관성 검증 실패: '+String(e.message??e).slice(0,250)}}
}
export function summarizeTestReadiness({openingFile,evidenceFile}={}){
 const checks=[
  checkFile('OPENING',openingFile,validateFinalOpeningReviewFile,'OFFLINE_REVIEW_READY'),
  checkFile('EVIDENCE',evidenceFile,validateTestEvidenceFile,'OFFLINE_TEST_EVIDENCE_REVIEWED'),
  {id:'SERVER',status:'NOT_VERIFIED',detail:'TEST Supabase 권한·격리·롤백 실증 미실시'},
  {id:'MIGRATION',status:'NOT_AUTHORIZED',detail:'별도 명시적 승인 없음'}
 ];
 const warnings=[];
 if(checks[0].status==='READY'&&checks[1].status==='READY')warnings.push('두 JSON은 각각 독립적으로 검증되었습니다. 동일한 보유종목·계좌 입력에 대한 증빙인지 자동 확인되지 않습니다.');
 return {status:checks[0].status==='READY'&&checks[1].status==='READY'?'OFFLINE_REVIEW_READY_SERVER_PENDING':'TEST_REVIEW_INCOMPLETE',checks,warnings,serverVerified:false,canPost:false,canMigrate:false,authorization:'NONE'};
}
