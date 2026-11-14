import {compareOpeningSnapshots} from './opening-snapshot-compare.mjs';
// Explicit user attestations are mandatory; comparisons alone do not authorize migration.
export function assessOpeningMigrationGate(source,candidate,confirmations={}){
 const comparison=compareOpeningSnapshots(source,candidate);
 const required=['accountOwnership','historicalCostBasis','cashBalances'];
 const missing=required.filter(k=>confirmations[k]!==true);
 const differences=comparison.rows.filter(r=>r.status!=='MATCH');
 const ready=comparison.rows.length>0&&differences.length===0&&missing.length===0;
 return {status:ready?'READY_FOR_TEST_REVIEW':'BLOCKED',readyForTestReview:ready,
  readyForUpload:false,uploadAuthorized:false,comparison,
  missingConfirmations:missing,differences:differences.map(r=>({key:r.key,status:r.status})),
  warning:'Review gate only. No Supabase writes, no posting, no production authorization.'};
}
