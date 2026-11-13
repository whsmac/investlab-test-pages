import {validateTestEvidenceFile} from './test-evidence-file.mjs';
import {validateFinalOpeningReviewFile} from './opening-final-review-file.mjs';
export function summarizeTestReadiness({openingFile,evidenceFile}={}){
 const checks=[];
 let opening=null,evidence=null;
 try{opening=validateFinalOpeningReviewFile(openingFile);checks.push({id:'OPENING',status:opening.review.status==='OFFLINE_REVIEW_READY'?'READY':'BLOCKED',detail:opening.review.status})}catch(e){checks.push({id:'OPENING',status:'MISSING_OR_INVALID',detail:String(e.message??e)})}
 try{evidence=validateTestEvidenceFile(evidenceFile);checks.push({id:'EVIDENCE',status:evidence.summary.status==='OFFLINE_TEST_EVIDENCE_REVIEWED'?'READY':'BLOCKED',detail:evidence.summary.status})}catch(e){checks.push({id:'EVIDENCE',status:'MISSING_OR_INVALID',detail:String(e.message??e)})}
 checks.push({id:'SERVER',status:'NOT_VERIFIED',detail:'TEST Supabase 권한·격리·롤백 실증 미실시'});
 checks.push({id:'MIGRATION',status:'NOT_AUTHORIZED',detail:'별도 명시적 승인 없음'});
 return {status:checks[0].status==='READY'&&checks[1].status==='READY'?'OFFLINE_REVIEW_READY_SERVER_PENDING':'TEST_REVIEW_INCOMPLETE',checks,serverVerified:false,canPost:false,canMigrate:false,authorization:'NONE'};
}
