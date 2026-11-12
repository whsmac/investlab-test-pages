// Offline validation only. No Supabase/network/storage access.
// Numbers are accepted as decimal strings to avoid JS floating-point money arithmetic.
const DECIMAL=/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;
const TICKER=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
const MAX=10n**26n;
function units(value,label){
 if(typeof value!=='string'||!DECIMAL.test(value))throw Error(label+': decimal string required (max 8 places)');
 const [whole,fraction='']=value.split('.');
 const result=BigInt(whole)*100000000n+BigInt(fraction.padEnd(8,'0'));
 if(result>MAX)throw Error(label+': out of range');
 return result;
}
const format=v=>{const sign=v<0n?'-':'';const n=v<0n?-v:v;return sign+(n/100000000n).toString()+'.'+(n%100000000n).toString().padStart(8,'0')};
const fail=s=>{throw Error(s)};
export function validateTradeDraft(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('invalid input');
 const {requestId,accountId,side,ticker,quantity,unitPriceUsd}=input;
 if(typeof requestId!=='string'||requestId.length<1||requestId.length>120)fail('invalid requestId');
 if(typeof accountId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId))fail('invalid accountId');
 if(side!=='buy'&&side!=='sell')fail('invalid side');
 if(typeof ticker!=='string'||!TICKER.test(ticker)||ticker==='USD-CASH'||ticker==='KRW')fail('invalid ticker');
 const qty=units(quantity,'quantity'),price=units(unitPriceUsd,'unitPriceUsd');
 if(qty===0n||price===0n)fail('quantity and price must be positive');
 // Price * quantity, expressed in USD with 8 fractional digits. Reject non-exact rounding.
 const product=qty*price;
 if(product%100000000n!==0n)fail('trade value has more than 8 decimal places');
 const cash=product/100000000n;
 if(cash>MAX)fail('trade value out of range');
 return Object.freeze({
   requestId,accountId,side,ticker,
   securityDelta:(side==='buy'?'+':'-')+format(qty),
   cashDelta:(side==='buy'?'-':'+')+format(cash),
   currency:'USD',
   warning:'PREVIEW ONLY: no order, ledger posting or tax calculation'
 });
}
export function previewLedgerBalances(events){
 if(!Array.isArray(events))fail('events must be an array');
 const seen=new Set(),balances=new Map();
 for(const e of events){
  if(!e||typeof e!=='object'||typeof e.eventId!=='string'||!e.eventId)fail('invalid event');
  if(seen.has(e.eventId))fail('duplicate eventId');
  seen.add(e.eventId);
  if(!Array.isArray(e.legs)||e.legs.length===0)fail('missing legs');
  for(const leg of e.legs){
   if(!leg||!['cash','security'].includes(leg.assetType)||typeof leg.assetCode!=='string'||!TICKER.test(leg.assetCode))fail('invalid leg');
   if(leg.assetType==='cash'&&!['USD','KRW'].includes(leg.assetCode))fail('invalid cash currency');
   if(leg.assetType==='security'&&['USD-CASH','KRW'].includes(leg.assetCode))fail('invalid security ticker');
   if(typeof leg.delta!=='string'||!/^-(?:0|[1-9]\d*)(?:\.\d{1,8})?$|^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(leg.delta))fail('invalid delta');
   const negative=leg.delta.startsWith('-');
   const n=units(negative?leg.delta.slice(1):leg.delta,'delta')*(negative?-1n:1n);
   if(n===0n)fail('zero delta');
   const key=leg.assetType+':'+leg.assetCode;
   balances.set(key,(balances.get(key)??0n)+n);
  }
 }
 return Object.freeze(Object.fromEntries([...balances].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,format(v)])));
}
