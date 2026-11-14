// Read-only, portable split-allocation review report and change comparison.
import {previewSplitAccountAllocation} from './legacy-split-account-allocation.mjs';
import {buildPortfolioLedgerView} from './portfolio-ledger-view-model.mjs';
const FORMAT='INVESTLAB_SPLIT_ALLOCATION_REVIEW';
const SAFE={canImport:false,canPersist:false,serverVerified:false,approvalStatus:'NOT_APPROVED'};
export function buildSplitAllocationReport(input={}){
 const preview=previewSplitAccountAllocation(input);
 return {format:FORMAT,version:1,accountScope:'EXPLICIT_MULTI_ACCOUNT',status:preview.status,
  rows:preview.rows.map(r=>({ticker:r.ticker,sourceQuantity:r.sourceQuantity,allocatedQuantity:r.allocatedQuantity,remainingQuantity:r.remainingQuantity,accounts:r.accounts.map(a=>({accountId:a.accountId,accountName:a.accountName,assignedQuantity:a.assignedQuantity,ledgerQuantity:a.ledgerQuantity,difference:a.difference}))})),
  remainingCount:preview.remainingCount,...SAFE};
}
export function serializeSplitAllocationReport(input){return JSON.stringify(buildSplitAllocationReport(input),null,2);}
const Q=/^(?:0|[1-9]\d*)\.\d{8}$/;
const SIGNED=/^-?(?:0|[1-9]\d*)\.\d{8}$/;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validate(report){
 if(!report||typeof report!=='object'||Array.isArray(report)||report.format!==FORMAT||report.version!==1||report.accountScope!=='EXPLICIT_MULTI_ACCOUNT')throw Error('unsupported split allocation report');
 if(report.canImport!==false||report.canPersist!==false||report.serverVerified!==false||report.approvalStatus!=='NOT_APPROVED')throw Error('unsafe report flags');
 if(!Array.isArray(report.rows)||report.rows.length>10000)throw Error('invalid report rows');
 const result=new Map();
 for(const row of report.rows){
  if(!row||typeof row.ticker!=='string'||!/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/.test(row.ticker)||result.has(row.ticker)||![row.sourceQuantity,row.allocatedQuantity,row.remainingQuantity].every(v=>typeof v==='string'&&Q.test(v))||!Array.isArray(row.accounts)||row.accounts.length>1000)throw Error('invalid or duplicate report row');
  const accounts=new Map();
  for(const account of row.accounts){
   if(!account||typeof account.accountId!=='string'||!ID.test(account.accountId)||accounts.has(account.accountId.toLowerCase())||typeof account.assignedQuantity!=='string'||!Q.test(account.assignedQuantity)||typeof account.ledgerQuantity!=='string'||!Q.test(account.ledgerQuantity)||typeof account.difference!=='string'||!SIGNED.test(account.difference))throw Error('invalid or duplicate report account');
   accounts.set(account.accountId.toLowerCase(),{assignedQuantity:account.assignedQuantity,ledgerQuantity:account.ledgerQuantity,difference:account.difference});
  }
  result.set(row.ticker,{sourceQuantity:row.sourceQuantity,allocatedQuantity:row.allocatedQuantity,remainingQuantity:row.remainingQuantity,accounts});
 }
 return result;
}
export function compareSplitAllocationReport({savedReport,...currentInput}={}){
 const old=validate(savedReport),fresh=buildSplitAllocationReport(currentInput),now=validate(fresh);
 const changes=[];
 for(const ticker of [...new Set([...old.keys(),...now.keys()])].sort()){
  const before=old.get(ticker),after=now.get(ticker);
  if(!before||!after){changes.push({ticker,kind:before?'REMOVED_SYMBOL':'NEW_SYMBOL'});continue;}
  if(['sourceQuantity','allocatedQuantity','remainingQuantity'].some(k=>before[k]!==after[k]))changes.push({ticker,kind:'TOTAL_QUANTITY_CHANGED'});
  for(const accountId of [...new Set([...before.accounts.keys(),...after.accounts.keys()])].sort()){
   const a=before.accounts.get(accountId),b=after.accounts.get(accountId);
   if(!a||!b||['assignedQuantity','ledgerQuantity','difference'].some(k=>a[k]!==b[k]))changes.push({ticker,accountId,kind:!a?'NEW_ACCOUNT_ALLOCATION':!b?'REMOVED_ACCOUNT_ALLOCATION':'ACCOUNT_QUANTITY_CHANGED',previous:a??null,current:b??null});
  }
 }
 return {status:changes.length?'CHANGES_REQUIRE_REVIEW':'NO_CHANGES_NOT_VERIFIED',changedCount:changes.length,changes,canImport:false,canPersist:false,serverVerified:false};
}

export function restoreSplitAllocationReport({savedReport,...currentInput}={}){
 const saved=validate(savedReport);
 const current=previewSplitAccountAllocation({...currentInput,allocations:[]});
 const source=new Map(current.rows.map(row=>[row.ticker,row.sourceQuantity]));
 if(saved.size!==source.size||[...saved].some(([ticker,row])=>source.get(ticker)!==row.sourceQuantity))throw Error('source holdings changed; restore blocked');
 const validAccounts=new Set(buildPortfolioLedgerView({sessionUserId:currentInput.sessionUserId,accounts:currentInput.accounts,committedEvents:currentInput.committedEvents??[]}).accounts.map(a=>a.accountId));
 const allocations=[];
 for(const [ticker,row] of saved)for(const [accountId,entry] of row.accounts){
  if(!validAccounts.has(accountId))throw Error('saved account is not owned by current user');
  allocations.push({ticker,accountId,quantity:entry.assignedQuantity});
 }
 const reviewed=previewSplitAccountAllocation({...currentInput,allocations});
 return {status:'RESTORED_FOR_REVIEW_NOT_APPROVED',allocations,rows:reviewed.rows,canImport:false,canPersist:false,serverVerified:false};
}
