// Offline-only account allocation of imported legacy holdings and explicit cash balances.
import {buildLegacyHoldingsExport} from './legacy-holdings-export.mjs';
import {assessOpeningAccountPlan} from './opening-account-plan.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEC=/^(0|[1-9]\d*)(?:\.\d{1,8})?$/;
const SCALE=100000000n;
const amount=s=>{if(typeof s!=='string'||!DEC.test(s))throw Error('decimal string required');const [a,b='']=s.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'))};
const fmt=n=>(n/SCALE).toString()+'.'+(n%SCALE).toString().padStart(8,'0');
export function allocatePortfolioOpening({exportData,accounts=[],allocations=[],cash=[]}={}){
 if(!exportData||exportData.format!=='INVESTLAB_LEGACY_HOLDINGS_JSON'||exportData.version!==1)throw Error('unsupported legacy export');
 const holdings=buildLegacyHoldingsExport(exportData.holdings).holdings;
 if(!Array.isArray(allocations)||!Array.isArray(cash)||!Array.isArray(accounts))throw Error('invalid account allocations');
 const ids=new Set(accounts.map(a=>a?.id?.toLowerCase()));
 const expected=new Map(holdings.map(h=>[h.symbol,{quantity:amount(h.shares),averageCostUsd:amount(h.avg_cost)}]));
 const totals=new Map(),positions=[],seen=new Set();
 for(const row of allocations){
  if(!row||typeof row.ticker!=='string'||!expected.has(row.ticker)||typeof row.accountId!=='string'||!UUID.test(row.accountId)||!ids.has(row.accountId.toLowerCase()))throw Error('unknown ticker or account');
  const id=row.accountId.toLowerCase(),key=id+'|'+row.ticker;if(seen.has(key))throw Error('duplicate account/ticker allocation');seen.add(key);
  const q=amount(row.quantity);if(q===0n)throw Error('allocation quantity must be positive');
  const h=expected.get(row.ticker);totals.set(row.ticker,(totals.get(row.ticker)||0n)+q);
  positions.push({accountId:id,ticker:row.ticker,quantity:fmt(q),averageCostUsd:fmt(h.averageCostUsd)});
 }
 const warnings=[];
 for(const [ticker,h] of expected){const assigned=totals.get(ticker)||0n;if(assigned!==h.quantity)warnings.push(ticker+': allocation quantity does not match imported holdings');}
 const cashRows=cash.map(row=>{if(!row||typeof row.accountId!=='string'||!UUID.test(row.accountId)||!ids.has(row.accountId.toLowerCase()))throw Error('unknown cash account');return {...row,accountId:row.accountId.toLowerCase()}});
 const plan=assessOpeningAccountPlan({accounts,positions,cash:cashRows});
 return {...plan,status:warnings.length?'ALLOCATION_MISMATCH_REVIEW_REQUIRED':plan.status,warnings:[...warnings,...plan.warnings],allocatedPositions:positions,explicitCash:cashRows,canUpload:false,canMigrate:false,serverVerified:false};
}
