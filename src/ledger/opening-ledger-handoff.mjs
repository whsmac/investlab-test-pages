// Pure offline opening handoff; never creates an actual trade or calls a server.
import {allocatePortfolioOpening} from './portfolio-account-allocation.mjs';
import {simulateLedgerEvents} from './offline-event-ledger.mjs';
import {reconcilePortfolioLedger} from './portfolio-ledger-reconcile.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEC=/^(0|[1-9]\d*)(?:\.\d{1,8})?$/;
const SCALE=100000000n;
function n(s){if(typeof s!=='string'||!DEC.test(s))throw Error('invalid cost basis decimal');const [a,b='']=s.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(8,'0'))}
function fmt(v){return (v/SCALE).toString()+'.'+(v%SCALE).toString().padStart(8,'0')}
export function prepareOpeningLedgerHandoff({exportData,accounts,allocations,cash=[],costConfirmations=[]}={}){
 const plan=allocatePortfolioOpening({exportData,accounts,allocations,cash});
 if(!Array.isArray(costConfirmations))throw Error('cost confirmations must be an array');
 const confirmed=new Map(),issues=[...plan.warnings];
 for(const c of costConfirmations){
  if(!c||typeof c.accountId!=='string'||typeof c.ticker!=='string'||typeof c.confirmedAverageCostUsd!=='string'||c.ownerVerified!==true)throw Error('explicit account-level cost and ownership confirmation required');
  const key=c.accountId.toLowerCase()+'|'+c.ticker;
  if(confirmed.has(key))throw Error('duplicate cost confirmation');
  confirmed.set(key,c.confirmedAverageCostUsd);
 }
 const positions=plan.allocatedPositions.map(p=>{
  const key=p.accountId+'|'+p.ticker,verified=confirmed.get(key);
  if(verified===undefined){issues.push(key+': actual account cost basis unconfirmed');return p}
  const value=n(verified);if(value===0n)issues.push(key+': zero cost basis requires review');
  return {...p,averageCostUsd:fmt(value)};
 });
 for(const key of confirmed.keys())if(!positions.some(p=>p.accountId+'|'+p.ticker===key))throw Error('cost confirmation does not match an allocated position');
 const ready=issues.length===0&&positions.length+plan.explicitCash.length>0;
 if(!ready)return {status:'OPENING_REVIEW_REQUIRED',issues,positions,cash:plan.explicitCash,events:[],canPost:false,canMigrate:false,serverVerified:false};
 const grouped=new Map();
 for(const p of positions){if(!grouped.has(p.accountId))grouped.set(p.accountId,[]);grouped.get(p.accountId).push({assetType:'security',assetCode:p.ticker,delta:p.quantity})}
 for(const c of plan.explicitCash){if(n(c.balance)===0n)continue;if(!grouped.has(c.accountId))grouped.set(c.accountId,[]);grouped.get(c.accountId).push({assetType:'cash',assetCode:c.currency,delta:c.balance})}
 const events=[...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([accountId,legs])=>({id:'opening-'+accountId,accountId,requestId:'offline-opening-'+accountId,type:'opening',legs}));
 if(!events.length)return {status:'OPENING_REVIEW_REQUIRED',issues:['no nonzero opening balances'],positions,cash:plan.explicitCash,events:[],canPost:false,canMigrate:false,serverVerified:false};
 simulateLedgerEvents(events);
 const comparison=reconcilePortfolioLedger({positions,cash:plan.explicitCash,events});
 if(comparison.differences.length)throw Error('opening reconciliation mismatch');
 return {status:'OFFLINE_OPENING_RECONCILED_NOT_SERVER_VERIFIED',issues:[],positions,cash:plan.explicitCash,events,comparison,canPost:false,canMigrate:false,serverVerified:false};
}
