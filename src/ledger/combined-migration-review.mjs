import {assessPreflightWithCatalog} from './preflight-catalog-integration.mjs';
import {assessIsolationEvidence} from './isolation-evidence-review.mjs';
// A/B results are manually recorded, never independently verified by this browser.
export function assessCombinedMigrationReview(manual={},catalog=null,isolation=null){
 const preflight=assessPreflightWithCatalog(manual,catalog);
 const isolationResult=assessIsolationEvidence(isolation??{});
 const isolationBlockers=[...isolationResult.failures,...isolationResult.missing];
 const blocked=preflight.status!=='READY_FOR_SEPARATE_APPROVAL'||isolationResult.status!=='MANUAL_EVIDENCE_RECORDED';
 return {status:blocked?'BLOCKED':'MANUAL_REVIEW_COMPLETE_NOT_SERVER_VERIFIED',
  preflight,isolation:isolationResult,isolationBlockers,
  serverVerified:false,canMigrate:false,canExecuteSql:false,canMerge:false,authorization:'NONE',
  note:'Even full manual observations and catalog checks require authenticated server evidence and explicit approval.'};
}
