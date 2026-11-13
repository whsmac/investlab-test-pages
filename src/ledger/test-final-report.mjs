import {summarizeTestReadiness} from './test-readiness-summary.mjs';
import {validateReviewTargetLink} from './review-target-link.mjs';
const FORMAT='INVESTLAB_TEST_FINAL_OFFLINE_REPORT';
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value}
export function buildTestFinalReport({openingFile,evidenceFile,link,openingDigest,evidenceDigest,createdAt}={}){
 if(typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt)))throw Error('invalid final report date');
 const readiness=summarizeTestReadiness({openingFile,evidenceFile});
 const pair=validateReviewTargetLink(link,{openingDigest,evidenceDigest});
 const linked=pair.matched&&pair.reviewerConfirmed;
 return {format:FORMAT,version:1,createdAt,readiness,link:{matched:pair.matched,reviewerConfirmed:pair.reviewerConfirmed,openingDigest,evidenceDigest},status:readiness.status==='OFFLINE_REVIEW_READY_SERVER_PENDING'&&linked?'OFFLINE_FILES_REVIEWED_SERVER_PENDING':'FINAL_REVIEW_INCOMPLETE',serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
}
export function validateTestFinalReport(saved){
 if(!saved||saved.format!==FORMAT||saved.version!==1||saved.serverVerified!==false||saved.canMigrate!==false||saved.canPost!==false||saved.authorization!=='NONE')throw Error('unsafe or unsupported final report');
 if(typeof saved.createdAt!=='string'||!Number.isFinite(Date.parse(saved.createdAt)))throw Error('invalid final report date');
 if(!saved.readiness||saved.readiness.serverVerified!==false||saved.readiness.canMigrate!==false||saved.readiness.canPost!==false||saved.readiness.authorization!=='NONE')throw Error('unsafe readiness flags');
 if(!saved.link||typeof saved.link.matched!=='boolean'||typeof saved.link.reviewerConfirmed!=='boolean'||!/^[a-f0-9]{64}$/.test(saved.link.openingDigest)||!/^[a-f0-9]{64}$/.test(saved.link.evidenceDigest))throw Error('invalid final report link');
 const checks=saved.readiness.checks;
 if(!Array.isArray(checks)||checks.length!==4||checks[2]?.id!=='SERVER'||checks[2]?.status!=='NOT_VERIFIED'||checks[3]?.id!=='MIGRATION'||checks[3]?.status!=='NOT_AUTHORIZED')throw Error('unsafe readiness checks');
 const expectedReadiness=checks[0]?.status==='READY'&&checks[1]?.status==='READY'?'OFFLINE_REVIEW_READY_SERVER_PENDING':'TEST_REVIEW_INCOMPLETE';
 const expectedStatus=expectedReadiness==='OFFLINE_REVIEW_READY_SERVER_PENDING'&&saved.link.matched&&saved.link.reviewerConfirmed?'OFFLINE_FILES_REVIEWED_SERVER_PENDING':'FINAL_REVIEW_INCOMPLETE';
 if(saved.readiness.status!==expectedReadiness||saved.status!==expectedStatus)throw Error('inconsistent final report status');
 return {status:saved.status,serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE',note:'파일 내용은 독립적으로 재검증해야 하며 이 보고서는 서버 검증 증빙이 아닙니다'};
}
