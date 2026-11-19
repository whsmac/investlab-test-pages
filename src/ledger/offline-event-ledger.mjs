// Offline-only sequential event ledger. No network, storage, SQL, or RPC calls.
const SCALE=100000000n;
const DEC=/^-?(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;
const SYMBOL=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
function parse(v,positive=false){if(typeof v!=='string'||!DEC.test(v))throw Error('invalid fixed-8 decimal');const neg=v[0]==='-',s=neg?v.slice(1):v,[a,b='']=s.split('.');const n=(BigInt(a)*SCALE+BigInt(b.padEnd(8,'0')))*(neg?-1n:1n);if(positive&&n<=0n)throw Error('positive amount required');if(n>10n**26n||n<-(10n**26n))throw Error('amount out of range');return n}
function fmt(n){return (n<0n?'-':'')+( (n<0n?-n:n)/SCALE).toString()+'.'+((n<0n?-n:n)%SCALE).toString().padStart(8,'0')}
function asset(type,code){if(type!=='cash'&&type!=='security')throw Error('invalid asset type');if(typeof code!=='string'||!SYMBOL.test(code))throw Error('invalid asset code');if(type==='cash'&&!['USD','KRW'].includes(code))throw Error('invalid cash currency');if(type==='security'&&['USD-CASH','KRW'].includes(code))throw Error('invalid security code');return type+':'+code}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b)}
export function simulateLedgerEvents(events){
 if(!Array.isArray(events)||events.length>10000)throw Error('invalid event list');
 const balances=new Map(),requests=new Map(),history=[],openAccounts=new Set(),eventsById=new Map();
 for(const [index,e] of events.entries()){
  if(!e||typeof e!=='object'||typeof e.accountId!=='string'||!e.accountId||typeof e.requestId!=='string'||!e.requestId||typeof e.id!=='string'||!e.id||!['opening','buy','sell','deposit','withdrawal','fee','reversal'].includes(e.type)||!Array.isArray(e.legs)||!e.legs.length)throw Error('invalid event at '+index);
  const requestKey=e.accountId+'\u0000'+e.requestId;
  if(requests.has(requestKey)){if(!equal(requests.get(requestKey),e))throw Error('conflicting request ID');history.push({id:e.id,status:'IDEMPOTENT_RETRY'});continue}
  if(eventsById.has(e.id))throw Error('duplicate event ID');
  const snapshot=new Map(balances),seen=new Set(),legRows=[];
  for(const l of e.legs){
   if(!l||typeof l!=='object')throw Error('invalid leg');
   const key=e.accountId+'\u0000'+asset(l.assetType,l.assetCode);
   if(seen.has(key))throw Error('duplicate asset leg');seen.add(key);
   const delta=parse(l.delta);if(delta===0n)throw Error('zero leg');
   snapshot.set(key,(snapshot.get(key)||0n)+delta);
   if(snapshot.get(key)<0n)throw Error('insufficient balance: '+l.assetCode);
   legRows.push({key,delta});
  }
  if(e.type==='opening'){
   if(openAccounts.has(e.accountId))throw Error('duplicate opening event');
   if(legRows.some(l=>l.delta<=0n))throw Error('opening must be positive');
  }else if(!openAccounts.has(e.accountId))throw Error('account not opened');
  if(e.type==='buy'||e.type==='sell'){
   if(legRows.length!==2)throw Error('trade requires two legs');
   const cash=e.legs.find(l=>l.assetType==='cash'&&l.assetCode==='USD'),security=e.legs.find(l=>l.assetType==='security');
   if(!cash||!security)throw Error('trade requires USD cash and security');
   const q=parse(security.delta),c=parse(cash.delta);
   if(e.type==='buy'&&!(q>0n&&c<0n)||e.type==='sell'&&!(q<0n&&c>0n))throw Error('invalid trade direction');
  }
  if(['deposit','withdrawal','fee'].includes(e.type)){
   if(legRows.length!==1||e.legs[0].assetType!=='cash')throw Error('cash event requires one cash leg');
   const d=legRows[0].delta;
   if(e.type==='deposit'&&d<=0n||e.type!=='deposit'&&d>=0n)throw Error('invalid cash event direction');
  }
  if(e.type==='reversal'){
   if(typeof e.reversesEventId!=='string'||!eventsById.has(e.reversesEventId))throw Error('missing reversal target');
   const target=eventsById.get(e.reversesEventId);
   if(target.accountId!==e.accountId||target.type==='opening'||target.type==='reversal'||target.reversed)throw Error('invalid reversal target');
   if(target.legs.length!==legRows.length)throw Error('reversal legs mismatch');
   for(const l of target.legs){const found=e.legs.find(x=>x.assetType===l.assetType&&x.assetCode===l.assetCode);if(!found||parse(found.delta)!==-parse(l.delta))throw Error('reversal must exactly negate target');}
   target.reversed=true;
  }
  balances.clear();for(const [k,v] of snapshot)balances.set(k,v);
  requests.set(requestKey,structuredClone(e));eventsById.set(e.id,{...structuredClone(e),reversed:false});
  if(e.type==='opening')openAccounts.add(e.accountId);
  history.push({id:e.id,status:'APPLIED'});
 }
 return {status:'OFFLINE_ONLY_NOT_SERVER_VERIFIED',balances:[...balances].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>({accountAsset:key.replace('\u0000',' / '),balance:fmt(value)})),history,canPost:false,canMigrate:false,serverVerified:false};
}
