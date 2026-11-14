// Read-only discrepancy review; never creates opening events or changes holdings.
import {reconcileLegacyExportWithLedger} from './legacy-ledger-reconciliation.mjs';
const CHOICES=new Set(['CHECK_ACCOUNT','CHECK_TRADE_HISTORY','CHECK_EXPORT_DATE','ACCEPT_LEDGER_AS_REFERENCE']);
export function reviewLegacyLedgerDiscrepancies(input={}){
 const {decisions=[],...comparisonInput}=input;
 const comparison=reconcileLegacyExportWithLedger(comparisonInput);
 if(!Array.isArray(decisions))throw Error('invalid review decisions');
 const decisionMap=new Map();
 for(const decision of decisions){
  if(!decision||typeof decision!=='object'||Array.isArray(decision))throw Error('invalid decision');
  if(typeof decision.ticker!=='string'||decisionMap.has(decision.ticker))throw Error('duplicate or invalid decision ticker');
  if(!CHOICES.has(decision.reason))throw Error('invalid review reason');
  if(typeof decision.note!=='string'||decision.note.trim().length<3||decision.note.trim().length>500)throw Error('review note required (3-500 characters)');
  decisionMap.set(decision.ticker,{reason:decision.reason,note:decision.note.trim()});
 }
 const unresolved=comparison.rows.filter(r=>r.status!=='ALREADY_PRESENT');
 for(const ticker of decisionMap.keys())if(!unresolved.some(r=>r.ticker===ticker))throw Error('decision must refer to a mismatched ticker');
 const rows=comparison.rows.map(r=>Object.freeze({...r,review:decisionMap.get(r.ticker)??null}));
 const reviewedCount=rows.filter(r=>r.review!==null).length;
 return Object.freeze({
  status:unresolved.length===0?'NO_DISCREPANCIES':reviewedCount===unresolved.length?'REVIEW_NOTES_COMPLETE_NOT_VERIFIED':'REVIEW_INCOMPLETE',
  accountId:comparison.accountId,rows,discrepancyCount:unresolved.length,reviewedCount,
  pendingCount:unresolved.length-reviewedCount,
  canConfirmOpening:false,canImport:false,canPersist:false,serverVerified:false,
  requiresSourceDateAndAccountOwnershipVerification:true
 });
}
