// Read-only portfolio projection from the same offline ledger events used by Unified Ledger.
// No Supabase access, persistent writes, market prices, cost-basis or P&L estimation.
import {simulateLedgerEvents} from './offline-event-ledger.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SYMBOL=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
const FIXED=/^(0|[1-9][0-9]*)\.([0-9]{8})$/;
function requireId(value,label){if(typeof value!=='string'||!UUID.test(value))throw Error('invalid '+label);return value.toLowerCase();}
function parseFixed(value){if(typeof value!=='string'||!FIXED.test(value))throw Error('invalid ledger balance');const [whole,fraction]=value.split('.');return BigInt(whole)*100000000n+BigInt(fraction);}
function fmt(n){return (n/100000000n).toString()+'.'+(n%100000000n).toString().padStart(8,'0');}
function checkEvents(events,accountMap,owner){
 if(!Array.isArray(events)||events.length>10000)throw Error('invalid events');
 return events.filter(event=>{
  if(!event||typeof event!=='object'||Array.isArray(event))throw Error('invalid event');
  if('userId' in event||'ownerId' in event)throw Error('client-supplied event owner forbidden');
  const id=requireId(event.accountId,'event account ID');
  if(!accountMap.has(id))throw Error('unknown event account');
  return accountMap.get(id).ownerId===owner;
 }).map(e=>structuredClone(e));
}
export function projectPortfolioFromLedger({sessionUserId,accounts,committedEvents=[]}={}){
 const owner=requireId(sessionUserId,'session user ID');
 if(!Array.isArray(accounts)||accounts.length>100)throw Error('invalid accounts');
 const accountMap=new Map();
 for(const account of accounts){
  if(!account||typeof account!=='object'||Array.isArray(account))throw Error('invalid account');
  const id=requireId(account.id,'account ID'),userId=requireId(account.ownerId,'account owner');
  if(accountMap.has(id))throw Error('duplicate account');
  if(typeof account.name!=='string'||!account.name.trim())throw Error('invalid account name');
  accountMap.set(id,{id,ownerId:userId,name:account.name.trim()});
 }
 const events=checkEvents(committedEvents,accountMap,owner);
 const result=simulateLedgerEvents(events);
 const ownAccounts=[...accountMap.values()].filter(a=>a.ownerId===owner);
 const byAccount=new Map(ownAccounts.map(a=>[a.id,{accountId:a.id,name:a.name,positions:[],cash:[]}]));
 const consolidated=new Map();
 for(const row of result.balances){
  const separator=row.accountAsset.indexOf(' / ');
  if(separator<0)throw Error('invalid ledger account balance key');
  const accountId=row.accountAsset.slice(0,separator);
  const asset=row.accountAsset.slice(separator+3);
  const colon=asset.indexOf(':');
  if(colon<0)throw Error('invalid ledger asset key');
  const assetType=asset.slice(0,colon),assetCode=asset.slice(colon+1);
  if(!SYMBOL.test(assetCode)||!['cash','security'].includes(assetType))throw Error('invalid ledger asset');
  const account=byAccount.get(accountId);
  if(!account)throw Error('ledger owner/account mismatch');
  const quantity=parseFixed(row.balance);
  if(quantity===0n)continue;
  if(assetType==='security')account.positions.push({ticker:assetCode,quantity:fmt(quantity)});
  else account.cash.push({currency:assetCode,balance:fmt(quantity)});
  const key=assetType+':'+assetCode;
  consolidated.set(key,(consolidated.get(key)??0n)+quantity);
 }
 const compare=(a,b)=>a.localeCompare(b,'en');
 for(const a of byAccount.values()){a.positions.sort((x,y)=>compare(x.ticker,y.ticker));a.cash.sort((x,y)=>compare(x.currency,y.currency));}
 const positions=[],cash=[];
 for(const [key,n] of consolidated){
  if(n===0n)continue;
  const [type,code]=key.split(':');
  if(type==='security')positions.push({ticker:code,quantity:fmt(n)});
  else cash.push({currency:code,balance:fmt(n)});
 }
 positions.sort((a,b)=>compare(a.ticker,b.ticker));cash.sort((a,b)=>compare(a.currency,b.currency));
 return Object.freeze({status:'OFFLINE_PORTFOLIO_PROJECTION_ONLY',accounts:[...byAccount.values()],positions,cash,source:'UNIFIED_LEDGER_EVENTS',canPersist:false,serverVerified:false,pricesIncluded:false,profitLossIncluded:false});
}
