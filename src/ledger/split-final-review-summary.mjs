// Offline-only consolidated allocation and discrepancy review status.
import {previewSplitAccountAllocation} from './legacy-split-account-allocation.mjs';
import {summarizeSplitLedgerDifferences} from './split-ledger-difference-summary.mjs';
import {reviewSplitLedgerDiscrepancies} from './split-ledger-discrepancy-review.mjs';
export function buildSplitFinalReviewSummary({decisions=[],...input}={}){
 const allocation=previewSplitAccountAllocation(input);
 const ledger=summarizeSplitLedgerDifferences(allocation);
 const notes=reviewSplitLedgerDiscrepancies({...input,decisions});
 const allocationComplete=allocation.remainingCount===0;
 const ledgerMatched=ledger.unmatchedPairs===0;
 const notesComplete=notes.pendingCount===0;
 const items=[
  {key:'allocation',label:'종목 수량 배정',status:allocationComplete?'COMPLETE':'INCOMPLETE',completed:allocation.rows.length-allocation.remainingCount,total:allocation.rows.length},
  {key:'ledger',label:'원장 수량 대조',status:ledgerMatched?'MATCHED':'DIFFERENCES_FOUND',completed:ledger.matchedPairs,total:ledger.comparedPairs},
  {key:'notes',label:'불일치 검토 메모',status:notesComplete?'NOTED':'PENDING',completed:notes.reviewedCount,total:notes.discrepancyCount}
 ];
 const status=!allocationComplete?'ALLOCATION_INCOMPLETE':!ledgerMatched?'LEDGER_DIFFERENCES_REQUIRE_REVIEW':'OFFLINE_QUANTITY_CHECK_COMPLETE_NOT_APPROVED';
 return Object.freeze({status,items,unassignedSymbols:allocation.remainingCount,ledgerDifferenceCount:ledger.unmatchedPairs,pendingNotes:notes.pendingCount,notesComplete,canApprove:false,canImport:false,canPersist:false,serverVerified:false,requiresOwnershipAndCostBasisVerification:true});
}
