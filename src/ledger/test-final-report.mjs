import {summarizeTestReadiness} from './test-readiness-summary.mjs';
import {validateReviewTargetLink} from './review-target-link.mjs';
export function buildTestFinalReport({openingFile,evidenceFile,link,openingDigest,evidenceDigest,createdAt}={}){
 if(typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt)))throw Error('invalid final report date');
 const readiness=summarizeTestReadiness({openingFile,evidenceFile});
 const pair=validateReviewTargetLink(link,{openingDigest,evidenceDigest});
 const linked=pair.matched&&pair.reviewerConfirmed;
 return {format:'INVESTLAB_TEST_FINAL_OFFLINE_REPORT',version:1,createdAt,readiness,link:{matched:pair.matched,reviewerConfirmed:pair.reviewerConfirmed},status:readiness.status==='OFFLINE_REVIEW_READY_SERVER_PENDING'&&linked?'OFFLINE_FILES_REVIEWED_SERVER_PENDING':'FINAL_REVIEW_INCOMPLETE',serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
}
