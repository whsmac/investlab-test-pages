// Offline transaction-batch preflight only. Never authorizes database writes.
// Real posting MUST lock the account, check auth.uid(), and commit all legs atomically in SQL.
import {simulateLedgerEvents} from './offline-event-ledger.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clone=value=>structuredClone(value);
function requireUuid(value,label){if(typeof value!=='string'||!UUID.test(value))throw Error('invalid '+label);return value.toLowerCase()}
export function reviewPostingBatch({sessionUserId,accounts,committedEvents=[],proposedEvents=[]}){
 const uid=requireUuid(sessionUserId,'session user ID');
 if(!Array.isArray(accounts)||!Array.isArray(committedEvents)||!Array.isArray(proposedEvents)||proposedEvents.length===0)throw Error('invalid posting batch');
 if(proposedEvents.length>100)throw Error('posting batch too large');
 const owners=new Map();
 for(const account of accounts){
  if(!account||typeof account!=='object')throw Error('invalid account');
  const aid=requireUuid(account.id,'account ID'),owner=requireUuid(account.ownerId,'account owner');
  if(owners.has(aid))throw Error('duplicate account ID');
  owners.set(aid,owner);
 }
 const select=(event,proposed)=>{
  if(!event||typeof event!=='object')throw Error('invalid event');
  if('userId' in event||'ownerId' in event)throw Error('client-supplied owner forbidden');
  const aid=requireUuid(event.accountId,'event account ID');
  if(!owners.has(aid))throw Error('unknown account');
  if(proposed&&owners.get(aid)!==uid)throw Error('cross-user posting forbidden');
  return owners.get(aid)===uid;
 };
 const existing=committedEvents.filter(e=>select(e,false)).map(clone);
 const incoming=proposedEvents.filter(e=>select(e,true)).map(clone);
 const original=simulateLedgerEvents(existing);
 const combined=simulateLedgerEvents([...existing,...incoming]);
 const newHistory=combined.history.slice(original.history.length);
 return Object.freeze({status:'OFFLINE_REVIEW_ONLY',ownerId:uid,reviewedEvents:incoming.length,applied:newHistory.filter(x=>x.status==='APPLIED').length,idempotentRetries:newHistory.filter(x=>x.status==='IDEMPOTENT_RETRY').length,balances:combined.balances,canPost:false,serverVerified:false,atomicityVerified:false,requiresAccountLock:true,requiresAuthenticatedABAnonTests:true});
}
