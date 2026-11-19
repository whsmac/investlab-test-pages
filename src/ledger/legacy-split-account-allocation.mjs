// TEST-only exact decimal multi-account allocation preview. No storage/network writes.
import {assessPortfolioMigration} from './portfolio-migration-assessment.mjs';
import {buildPortfolioLedgerView} from './portfolio-ledger-view-model.mjs';
const DEC=/^(0|[1-9]\d*)(?:\.(\d{1,8}))?$/;
const SCALE=100000000n;
function units(v){if(typeof v!=='string'||!DEC.test(v))throw Error('invalid allocation quantity');const [a,b='']=v.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'));}
function format(v){return (v/SCALE).toString()+'.'+(v%SCALE).toString().padStart(8,'0');}
export function previewSplitAccountAllocation({exportData,sessionUserId,accounts,committedEvents=[],allocations=[]}={}){
 if(!exportData||exportData.format!=='INVESTLAB_LEGACY_HOLDINGS_JSON'||exportData.version!==1||!Array.isArray(exportData.holdings)||exportData.holdings.length>10000)throw Error('unsupported legacy export');
 const assessment=assessPortfolioMigration({holdings:exportData.holdings});
 if(assessment.warnings.length||assessment.rows.length!==exportData.holdings.length)throw Error('legacy source review required');
 const view=buildPortfolioLedgerView({sessionUserId,accounts,committedEvents});
 const known=new Set(view.accounts.map(a=>a.accountId));
 if(!Array.isArray(allocations)||allocations.length>10000)throw Error('invalid allocations');
 const grouped=new Map(assessment.rows.map(r=>[r.ticker,[]]));
 const seen=new Set();
 for(const item of allocations){
  if(!item||typeof item.ticker!=='string'||typeof item.accountId!=='string')throw Error('invalid allocation');
  const ticker=item.ticker.trim().toUpperCase(),accountId=item.accountId.toLowerCase(),key=ticker+'|'+accountId;
  if(!grouped.has(ticker)||seen.has(key))throw Error('unknown or duplicate ticker/account allocation');
  if(!known.has(accountId))throw Error('account not owned by session user');
  const quantity=units(item.quantity);
  if(quantity===0n)throw Error('zero allocation not allowed');
  seen.add(key);grouped.get(ticker).push({accountId,quantity});
 }
 const rows=assessment.rows.map(r=>{
  const source=units(r.quantity),entries=grouped.get(r.ticker),allocated=entries.reduce((sum,e)=>sum+e.quantity,0n);
  if(allocated>source)throw Error('allocation exceeds source quantity: '+r.ticker);
  return Object.freeze({ticker:r.ticker,sourceQuantity:format(source),allocatedQuantity:format(allocated),remainingQuantity:format(source-allocated),status:allocated===source?'FULLY_ALLOCATED':'PARTIAL_OR_UNALLOCATED',accounts:entries.map(e=>{
   const account=view.accounts.find(a=>a.accountId===e.accountId);
   const actual=account.holdings.find(h=>h.ticker===r.ticker)?.quantity??'0.00000000';
   const difference=e.quantity-units(actual);
   return Object.freeze({accountId:e.accountId,accountName:account.name,assignedQuantity:format(e.quantity),ledgerQuantity:format(units(actual)),difference:(difference<0n?'-':'')+format(difference<0n?-difference:difference)});
  })});
 });
 const remainingCount=rows.filter(r=>r.status!=='FULLY_ALLOCATED').length;
 return Object.freeze({status:remainingCount?'ALLOCATION_INCOMPLETE':'FULLY_ALLOCATED_REVIEW_ONLY',rows,remainingCount,canImport:false,canPersist:false,serverVerified:false,requiresOwnershipAndCostBasisVerification:true});
}
