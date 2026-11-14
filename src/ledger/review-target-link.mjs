import {validateFinalOpeningReviewFile} from './opening-final-review-file.mjs';
import {validateTestEvidenceFile} from './test-evidence-file.mjs';
export function createReviewTargetLink({openingFile,evidenceFile,openingDigest,evidenceDigest,confirmed=false,createdAt}={}){
 const opening=validateFinalOpeningReviewFile(openingFile),evidence=validateTestEvidenceFile(evidenceFile);
 if(!/^[a-f0-9]{64}$/.test(openingDigest)||!/^[a-f0-9]{64}$/.test(evidenceDigest)||!Number.isFinite(Date.parse(createdAt??'')))throw Error('invalid review link input');
 return {format:'INVESTLAB_TEST_REVIEW_TARGET_LINK',version:1,createdAt,openingDigest,evidenceDigest,reviewerConfirmed:confirmed===true,source:'USER_CONFIRMED_FILE_PAIR_NOT_SERVER_VERIFIED',openingStatus:opening.status,evidenceStatus:evidence.summary.status,serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
}
export function validateReviewTargetLink(link,{openingDigest,evidenceDigest}={}){
 if(!link||link.format!=='INVESTLAB_TEST_REVIEW_TARGET_LINK'||link.version!==1||link.serverVerified!==false||link.canMigrate!==false||link.canPost!==false||link.authorization!=='NONE'||link.source!=='USER_CONFIRMED_FILE_PAIR_NOT_SERVER_VERIFIED'||typeof link.createdAt!=='string'||!Number.isFinite(Date.parse(link.createdAt)))throw Error('invalid or unsafe review link');
 if(!/^[a-f0-9]{64}$/.test(link.openingDigest)||!/^[a-f0-9]{64}$/.test(link.evidenceDigest))throw Error('invalid review digests');
 return {matched:link.openingDigest===openingDigest&&link.evidenceDigest===evidenceDigest,reviewerConfirmed:link.reviewerConfirmed===true,serverVerified:false,canMigrate:false,canPost:false};
}
