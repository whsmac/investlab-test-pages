// Explicit, read-only account allocation review. Never changes the legacy source or ledger.
import {assessPortfolioMigration} from './portfolio-migration-assessment.mjs';
import {buildPortfolioLedgerView} from './portfolio-ledger-view-model.mjs';
export function reviewLegacyAccountAllocation({exportData,sessionUserId,accounts,committedEvents=[],allocations=[]}={}){
 if(!exportData||exportData.format!=='INVESTLAB_LEGACY_HOLDINGS_JSON'||exportData.version!==1||!Array.isArray(exportData.holdings)||exportData.holdings.length>10000)throw Error('unsupported legacy export');
 const assessment=assessPortfolioMigration({holdings:exportData.holdings});
 if(assessment.warnings.length||assessment.rows.length!==exportData.holdings.length)throw Error('legacy holdings require source review');
 const view=buildPortfolioLedgerView({sessionUserId,accounts,committedEvents});
 if(!Array.isArray(allocations)||allocations.length>10000)throw Error('invalid allocations');
 const known=new Set(view.accounts.map(a=>a.accountId));
 const expected=new Map(assessment.rows.map(r=>[r.ticker,r]));
 const selected=new Map();
 for(const allocation of allocations){
  if(!allocation||typeof allocation.ticker!=='string'||typeof allocation.accountId!=='string')throw Error('invalid allocation');
  const ticker=allocation.ticker.trim().toUpperCase(),accountId=allocation.accountId.toLowerCase();
  if(!expected.has(ticker)||selected.has(ticker))throw Error('unknown or duplicate ticker allocation');
  if(!known.has(accountId))throw Error('account not owned by session user');
  selected.set(ticker,accountId);
 }
 const rows=assessment.rows.map(r=>Object.freeze({ticker:r.ticker,quantity:r.quantity,averageCostUsd:r.averageCostUsd,accountId:selected.get(r.ticker)??null,assigned:selected.has(r.ticker)}));
 const assignedCount=rows.filter(r=>r.assigned).length;
 return Object.freeze({status:assignedCount===rows.length?'ALL_ASSIGNED_REVIEW_ONLY':'ACCOUNT_ASSIGNMENT_INCOMPLETE',rows,assignedCount,pendingCount:rows.length-assignedCount,accounts:view.accounts.map(a=>({accountId:a.accountId,name:a.name})),canImport:false,canPersist:false,serverVerified:false,requiresOwnershipVerification:true,requiresCostBasisVerification:true});
}
