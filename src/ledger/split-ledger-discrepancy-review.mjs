// Read-only review of account-level ledger quantity discrepancies.
import {previewSplitAccountAllocation} from './legacy-split-account-allocation.mjs';
import {summarizeSplitLedgerDifferences} from './split-ledger-difference-summary.mjs';
const REASONS=new Set(['CHECK_ACCOUNT','CHECK_TRADE_HISTORY','CHECK_EXPORT_DATE','CHECK_LEDGER_EVENTS','ACCEPT_LEDGER_AS_REFERENCE']);
export function reviewSplitLedgerDiscrepancies({decisions=[],...input}={}){
 const summary=summarizeSplitLedgerDifferences(previewSplitAccountAllocation(input));
 if(!Array.isArray(decisions)||decisions.length>10000)throw Error('invalid decisions');
 const expected=new Map(summary.details.filter(x=>x.status==='LEDGER_DIFFERENCE').map(x=>[x.ticker+'|'+x.accountId,x]));
 const seen=new Set(),rows=[];
 for(const decision of decisions){
  if(!decision||typeof decision.ticker!=='string'||typeof decision.accountId!=='string')throw Error('invalid decision');
  const key=decision.ticker.trim().toUpperCase()+'|'+decision.accountId.toLowerCase();
  if(!expected.has(key)||seen.has(key))throw Error('unknown or duplicate discrepancy decision');
  if(!REASONS.has(decision.reason)||typeof decision.note!=='string'||decision.note.trim().length<3||decision.note.trim().length>500)throw Error('invalid reason or review note (3-500 chars)');
  seen.add(key);
  rows.push(Object.freeze({...expected.get(key),reason:decision.reason,note:decision.note.trim()}));
 }
 return Object.freeze({status:rows.length===expected.size?'ALL_DISCREPANCIES_NOTED_REVIEW_ONLY':'DISCREPANCY_REVIEW_INCOMPLETE',discrepancyCount:expected.size,reviewedCount:rows.length,pendingCount:expected.size-rows.length,rows,unassignedSymbols:summary.unassignedSymbols,canApprove:false,canImport:false,canPersist:false,serverVerified:false});
}
