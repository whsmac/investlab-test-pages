// Offline account cost-basis review report. Never writes to ledger or server.
import {reviewAccountCostBasis} from './account-cost-basis-review.mjs';
const FORMAT='INVESTLAB_ACCOUNT_COST_BASIS_REVIEW';
export function buildAccountCostReport(input){
 const reviewed=reviewAccountCostBasis(input);
 return {format:FORMAT,version:1,status:reviewed.status,rows:reviewed.rows.map(r=>({accountId:r.accountId,ticker:r.ticker,quantity:r.quantity,averageCostUsd:r.averageCostUsd})),canPersist:false,serverVerified:false};
}
export function restoreAccountCostReport({savedReport,accounts,entries}){
 if(!savedReport||savedReport.format!==FORMAT||savedReport.version!==1||savedReport.canPersist!==false||savedReport.serverVerified!==false||!Array.isArray(savedReport.rows))throw Error('invalid account cost report');
 const current=reviewAccountCostBasis({accounts,entries});
 const expected=new Map(current.rows.map(r=>[r.accountId+'|'+r.ticker,r]));
 if(savedReport.rows.length!==expected.size)throw Error('account holdings changed');
 const restored=new Set(),rows=[];
 for(const saved of savedReport.rows){
  if(!saved||typeof saved.accountId!=='string'||typeof saved.ticker!=='string'||typeof saved.quantity!=='string')throw Error('invalid saved row');
  const key=saved.accountId+'|'+saved.ticker,match=expected.get(key);
  if(!match||restored.has(key)||match.quantity!==saved.quantity)throw Error('account ticker or quantity changed');
  restored.add(key);
  rows.push({accountId:saved.accountId,ticker:saved.ticker,quantity:saved.quantity,averageCostUsd:saved.averageCostUsd});
 }
 const verified=reviewAccountCostBasis({accounts,entries:rows});
 return {status:'RESTORED_FOR_REVIEW_ONLY',rows:verified.rows,missingCount:verified.missingCount,canPersist:false,serverVerified:false};
}
