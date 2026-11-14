// Offline discrepancy notes report. Restore only when current discrepancies still match.
import {reviewSplitLedgerDiscrepancies} from './split-ledger-discrepancy-review.mjs';
import {previewSplitAccountAllocation} from './legacy-split-account-allocation.mjs';
import {summarizeSplitLedgerDifferences} from './split-ledger-difference-summary.mjs';
const FORMAT='INVESTLAB_SPLIT_DISCREPANCY_NOTES';
const KEY=r=>r.ticker+'|'+r.accountId;
export function buildSplitDiscrepancyNotesReport({decisions=[],...input}={}){
 const review=reviewSplitLedgerDiscrepancies({...input,decisions});
 const summary=summarizeSplitLedgerDifferences(previewSplitAccountAllocation(input));
 return {format:FORMAT,version:1,status:review.status,discrepancyCount:review.discrepancyCount,reviewedCount:review.reviewedCount,unassignedSymbols:review.unassignedSymbols,
  discrepancies:summary.details.filter(r=>r.status==='LEDGER_DIFFERENCE').map(r=>({ticker:r.ticker,accountId:r.accountId,assignedQuantity:r.assignedQuantity,ledgerQuantity:r.ledgerQuantity,difference:r.difference})),
  decisions:review.rows.map(r=>({ticker:r.ticker,accountId:r.accountId,reason:r.reason,note:r.note})),
  canApprove:false,canImport:false,canPersist:false,serverVerified:false};
}
export function restoreSplitDiscrepancyNotesReport({savedReport,...input}={}){
 if(!savedReport||savedReport.format!==FORMAT||savedReport.version!==1||savedReport.canApprove!==false||savedReport.canImport!==false||savedReport.canPersist!==false||savedReport.serverVerified!==false||!Array.isArray(savedReport.discrepancies)||!Array.isArray(savedReport.decisions)||savedReport.discrepancies.length>10000||savedReport.decisions.length>10000)throw Error('unsupported or unsafe notes report');
 const summary=summarizeSplitLedgerDifferences(previewSplitAccountAllocation(input));
 const fresh=summary.details.filter(r=>r.status==='LEDGER_DIFFERENCE');
 if(savedReport.discrepancies.length!==fresh.length)throw Error('discrepancy set changed; restore blocked');
 const current=new Map(fresh.map(r=>[KEY(r),r]));
 const seen=new Set();
 for(const row of savedReport.discrepancies){
  if(!row||typeof row.ticker!=='string'||typeof row.accountId!=='string')throw Error('invalid discrepancy row');
  const key=KEY(row),now=current.get(key);
  if(seen.has(key)||!now||['assignedQuantity','ledgerQuantity','difference'].some(k=>row[k]!==now[k]))throw Error('discrepancy quantities changed; restore blocked');
  seen.add(key);
 }
 const review=reviewSplitLedgerDiscrepancies({...input,decisions:savedReport.decisions});
 return {status:'NOTES_RESTORED_FOR_REVIEW_ONLY',decisions:review.rows.map(r=>({ticker:r.ticker,accountId:r.accountId,reason:r.reason,note:r.note})),reviewedCount:review.reviewedCount,pendingCount:review.pendingCount,canApprove:false,canImport:false,canPersist:false,serverVerified:false};
}
