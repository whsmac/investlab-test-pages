import {buildOpeningSnapshot} from './opening-snapshot-preview.mjs';
// Compare explicit account-mapped snapshots. No network, storage, or inferred allocations.
export function compareOpeningSnapshots(source,candidate){
 const a=buildOpeningSnapshot(source),b=buildOpeningSnapshot(candidate);
 const key=r=>r.kind==='opening_cash'?r.accountId+'|cash|'+r.currency:r.accountId+'|security|'+r.ticker;
 const index=new Map(b.rows.map(r=>[key(r),r]));
 const src=new Map(a.rows.map(r=>[key(r),r]));
 const equal=(x,y)=>{const parse=s=>{const [whole,frac='']=s.split('.');return BigInt(whole)*100000000n+BigInt(frac.padEnd(8,'0'));};return parse(x)===parse(y);};
 const rows=[];
 for(const [k,r] of src){
  const t=index.get(k);
  const fields=r.kind==='opening_cash'?['balance']:['quantity','averageCostUsd'];
  const status=!t?'MISSING':fields.every(f=>equal(r[f],t[f]))?'MATCH':'DIFFERENT';
  rows.push({key:k,kind:r.kind,source:r,candidate:t??null,status});
 }
 for(const [k,r] of index)if(!src.has(k))rows.push({key:k,kind:r.kind,source:null,candidate:r,status:'EXTRA'});
 return {status:rows.every(r=>r.status==='MATCH')?'ALL_MATCH':'REVIEW_REQUIRED',
  sourceCount:a.rows.length,candidateCount:b.rows.length,rows,
  warnings:['Account ownership, historical cost basis and cash balances must be verified independently.','OFFLINE ONLY: no Supabase writes or trade posting']};
}
