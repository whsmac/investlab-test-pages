// Offline account-by-account reconciliation between existing portfolio snapshot and event ledger.
import {buildOpeningSnapshot} from './opening-snapshot-preview.mjs';
import {simulateLedgerEvents} from './offline-event-ledger.mjs';
const SCALE=100000000n;
function parse(v){if(typeof v!=='string'||!/^(0|[1-9]\d*)(?:\.\d{1,8})?$/.test(v))throw Error('invalid decimal');const [a,b='']=v.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'))}
function fmt(n){const neg=n<0n,m=neg?-n:n;return (neg?'-':'')+(m/SCALE).toString()+'.'+(m%SCALE).toString().padStart(8,'0')}
export function reconcilePortfolioLedger({positions=[],cash=[],events=[]}={}){
 const snapshot=buildOpeningSnapshot({positions,cash});
 const ledger=simulateLedgerEvents(events);
 const expected=new Map();
 for(const row of snapshot.rows){
  const key=row.accountId+' / '+(row.kind==='opening_cash'?'cash:'+row.currency:'security:'+row.ticker);
  expected.set(key,parse(row.kind==='opening_cash'?row.balance:row.quantity));
 }
 const actual=new Map(ledger.balances.map(row=>[row.accountAsset,BigInt(row.balance.replace('.',''))]));
 const keys=[...new Set([...expected.keys(),...actual.keys()])].sort();
 const differences=keys.map(key=>({accountAsset:key,portfolio:fmt(expected.get(key)||0n),ledger:fmt(actual.get(key)||0n),delta:fmt((actual.get(key)||0n)-(expected.get(key)||0n))})).filter(row=>row.delta!=='0.00000000');
 return {status:differences.length?'MISMATCH_REVIEW_REQUIRED':'OFFLINE_QUANTITIES_MATCH_NOT_SERVER_VERIFIED',differences,comparedAssets:keys.length,portfolioRows:snapshot.rows.length,ledgerEvents:ledger.history.length,serverVerified:false,canUpload:false,canMigrate:false};
}
