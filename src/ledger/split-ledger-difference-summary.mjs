// Pure reconciliation summary for reviewed account allocations only. Never approves imports.
const DEC=/^-?(?:0|[1-9]\d*)\.\d{8}$/;
export function summarizeSplitLedgerDifferences(preview){
 if(!preview||!Array.isArray(preview.rows))throw Error('invalid split preview');
 const details=[];
 let matched=0,unmatched=0,unassigned=0;
 for(const row of preview.rows){
  if(!row||!Array.isArray(row.accounts)||typeof row.ticker!=='string')throw Error('invalid split row');
  if(row.status!=='FULLY_ALLOCATED')unassigned++;
  for(const account of row.accounts){
   if(typeof account.difference!=='string'||!DEC.test(account.difference))throw Error('invalid ledger difference');
   const equal=/^-?0\.00000000$/.test(account.difference);
   if(equal)matched++;else unmatched++;
   details.push(Object.freeze({ticker:row.ticker,accountId:account.accountId,accountName:account.accountName,assignedQuantity:account.assignedQuantity,ledgerQuantity:account.ledgerQuantity,difference:account.difference,status:equal?'MATCHED':'LEDGER_DIFFERENCE'}));
  }
 }
 return Object.freeze({status:unassigned?'ALLOCATION_INCOMPLETE':unmatched?'LEDGER_DIFFERENCES_FOUND':'ASSIGNED_PAIRS_MATCH_REVIEW_ONLY',totalSymbols:preview.rows.length,unassignedSymbols:unassigned,matchedPairs:matched,unmatchedPairs:unmatched,comparedPairs:details.length,details,scope:'ALLOCATED_ACCOUNT_SYMBOL_PAIRS_ONLY',canApprove:false,canImport:false,serverVerified:false});
}
