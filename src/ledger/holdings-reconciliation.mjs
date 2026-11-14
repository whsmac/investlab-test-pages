// Exact, offline source-vs-import reconciliation; no server calls.
import {buildLegacyHoldingsExport} from './legacy-holdings-export.mjs';
import {parseLegacyHoldingsFile} from './legacy-file-import.mjs';
const normalize=v=>{const s=String(v);if(!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(s))throw Error('invalid numeric field');const [a,b='']=s.split('.');return BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'));};
export function reconcileHoldingsRoundTrip(holdings,accountId){
 const exported=buildLegacyHoldingsExport(holdings);
 const imported=parseLegacyHoldingsFile(JSON.stringify(exported),accountId);
 if(imported.status!=='PREVIEW_ONLY_NOT_UPLOADED'||imported.positions.length!==holdings.length)throw Error('round-trip count mismatch');
 const original=new Map(exported.holdings.map(h=>[h.symbol,h]));
 const mismatches=[];
 for(const p of imported.positions){
  const o=original.get(p.ticker);
  if(!o||normalize(o.shares)!==normalize(p.quantity)||normalize(o.avg_cost)!==normalize(p.averageCostUsd))mismatches.push(p.ticker);
 }
 if(mismatches.length)throw Error('round-trip value mismatch: '+mismatches.join(','));
 return {status:'RECONCILED_OFFLINE_ONLY',sourceCount:holdings.length,importCount:imported.positions.length,tickers:imported.positions.map(p=>p.ticker),accountId,warnings:['Cost basis and account ownership require user confirmation; nothing uploaded.']};
}
