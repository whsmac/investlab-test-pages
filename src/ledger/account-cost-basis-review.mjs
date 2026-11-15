// Offline-only per-account cost basis review. No account inference or server writes.
const TICKER=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
const DEC=/^(0|[1-9]\d*)(?:\.\d{1,8})?$/;
export function reviewAccountCostBasis({accounts=[],entries=[]}={}){
 if(!Array.isArray(accounts)||!Array.isArray(entries))throw Error('invalid account cost review');
 const owners=new Map();
 for(const a of accounts){if(!a||typeof a.accountId!=='string'||typeof a.name!=='string'||owners.has(a.accountId))throw Error('invalid account');owners.set(a.accountId,a);}
 const seen=new Set(),rows=[];
 for(const e of entries){
  if(!e||!owners.has(e.accountId)||typeof e.ticker!=='string'||!TICKER.test(e.ticker)||typeof e.quantity!=='string'||!DEC.test(e.quantity))throw Error('invalid account holding');
  const key=e.accountId+'|'+e.ticker;if(seen.has(key))throw Error('duplicate account ticker');seen.add(key);
  const raw=e.averageCostUsd;
  const hasCost=raw!==null&&raw!==undefined&&String(raw).trim()!=='';
  if(hasCost&&(!DEC.test(String(raw))||!Number.isFinite(Number(raw))))throw Error('invalid average cost');
  rows.push(Object.freeze({accountId:e.accountId,accountName:owners.get(e.accountId).name,ticker:e.ticker,quantity:e.quantity,averageCostUsd:hasCost?String(raw):null,status:hasCost?'USER_ENTERED_UNVERIFIED':'MISSING_COST_BASIS'}));
 }
 return Object.freeze({status:'OFFLINE_ACCOUNT_COST_REVIEW_ONLY',rows,missingCount:rows.filter(r=>r.averageCostUsd===null).length,canImport:false,canPersist:false,serverVerified:false});
}
