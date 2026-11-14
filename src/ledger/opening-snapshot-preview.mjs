// Pure migration preview only: no network, storage or database writes.
// Explicit account mapping is mandatory; never infer account from ticker.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYMBOL=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
const DEC=/^(0|[1-9]\d*)(?:\.(\d{1,8}))?$/;
function amount(value,label,allowZero=true){
 if(typeof value!=='string'||!DEC.test(value))throw Error(label+': decimal string required (up to 8 places)');
 const [a,b='']=value.split('.');
 const n=BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'));
 if(n>10n**26n||(!allowZero&&n===0n))throw Error(label+': invalid range');
 return n;
}
const fmt=n=>(n/100000000n).toString()+'.'+(n%100000000n).toString().padStart(8,'0');
function account(value){if(typeof value!=='string'||!UUID.test(value))throw Error('accountId must be UUID');return value.toLowerCase();}
function ticker(value){if(typeof value!=='string'||!SYMBOL.test(value)||value==='USD-CASH'||value==='KRW')throw Error('invalid ticker');return value;}
export function buildOpeningSnapshot({positions=[],cash=[]}={}){
 if(!Array.isArray(positions)||!Array.isArray(cash))throw Error('positions and cash must be arrays');
 const seen=new Set(),rows=[],warnings=[];
 for(const [i,p] of positions.entries()){
  if(!p||typeof p!=='object')throw Error('invalid position at '+i);
  const a=account(p.accountId),t=ticker(p.ticker),q=amount(p.quantity,'quantity',false),cost=amount(p.averageCostUsd,'averageCostUsd');
  const key=a+'|'+t;
  if(seen.has(key))throw Error('duplicate account/ticker: '+t);
  seen.add(key);
  rows.push({accountId:a,ticker:t,quantity:fmt(q),averageCostUsd:fmt(cost),kind:'opening_position'});
 }
 for(const [i,c] of cash.entries()){
  if(!c||typeof c!=='object')throw Error('invalid cash at '+i);
  const a=account(c.accountId),currency=c.currency;
  if(currency!=='USD'&&currency!=='KRW')throw Error('unsupported currency');
  const n=amount(c.balance,'cash balance');
  const key=a+'|cash|'+currency;
  if(seen.has(key))throw Error('duplicate cash account/currency');
  seen.add(key);
  rows.push({accountId:a,currency,balance:fmt(n),kind:'opening_cash'});
 }
 if(!positions.length)warnings.push('No opening positions provided');
 if(!cash.length)warnings.push('No opening cash balances provided');
 warnings.push('Opening positions require verified historical cost basis and explicit account ownership');
 warnings.push('Opening snapshot is NOT a trade and must not be posted through buy/sell RPC');
 return {status:'PREVIEW_ONLY_NOT_UPLOADED',rows,warnings};
}
