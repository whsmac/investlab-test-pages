import {assessOpeningMigrationGate} from './opening-migration-gate.mjs';
export function createOpeningReviewReport(source,candidate,confirmations={}){
 const gate=assessOpeningMigrationGate(source,candidate,confirmations);
 return {format:'INVESTLAB_OPENING_REVIEW_V1',version:1,
  scope:'TEST_OFFLINE_REVIEW_ONLY',status:gate.status,
  readyForTestReview:gate.readyForTestReview,uploadAuthorized:false,
  summary:{sourceCount:gate.comparison.sourceCount,candidateCount:gate.comparison.candidateCount,matchCount:gate.comparison.rows.filter(r=>r.status==='MATCH').length,differenceCount:gate.differences.length},
  confirmations:{accountOwnership:confirmations.accountOwnership===true,historicalCostBasis:confirmations.historicalCostBasis===true,cashBalances:confirmations.cashBalances===true},
  missingConfirmations:gate.missingConfirmations,
  differences:gate.differences,
  rows:gate.comparison.rows,
  warnings:[...gate.comparison.warnings,'Report is not approval for any database migration or trade posting.']};
}
