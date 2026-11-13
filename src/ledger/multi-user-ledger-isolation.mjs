// Offline multi-user isolation contract. Never use this as an authorization boundary.
// Production authorization must derive owner from auth.uid() inside RLS/RPC.
import {simulateLedgerEvents} from './offline-event-ledger.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function id(v,label){if(typeof v!=='string'||!UUID.test(v))throw Error('invalid '+label);return v.toLowerCase()}
export function validateMultiUserLedgerFixture({accounts,events,sessionUserId}){
 if(!Array.isArray(accounts)||!Array.isArray(events))throw Error('invalid fixture');
 const current=id(sessionUserId,'session user ID');
 const owners=new Map(),byUser=new Map();
 for(const account of accounts){
  if(!account||typeof account!=='object')throw Error('invalid account');
  const aid=id(account.id,'account ID'),uid=id(account.ownerId,'owner ID');
  if(owners.has(aid))throw Error('duplicate account ID');
  owners.set(aid,uid);
  if(!byUser.has(uid))byUser.set(uid,[]);
 }
 const eventIds=new Set();
 for(const event of events){
  if(!event||typeof event!=='object')throw Error('invalid event');
  const aid=id(event.accountId,'event account ID');
  if(!owners.has(aid))throw Error('unknown account');
  // User IDs in client events are forbidden: the database must derive ownership from the session.
  if('ownerId' in event||'userId' in event)throw Error('client-supplied event owner forbidden');
  if(typeof event.id!=='string'||!event.id)throw Error('invalid event ID');
  const eid=owners.get(aid)+'\\0'+event.id;
  if(eventIds.has(eid))throw Error('duplicate event ID for owner');
  eventIds.add(eid);
  byUser.get(owners.get(aid)).push(structuredClone(event));
 }
 const ownerResults=[];
 for(const [uid,userEvents] of byUser){
  // Account IDs and request IDs must be isolated across users.
  const result=simulateLedgerEvents(userEvents);
  ownerResults.push({ownerId:uid,accountCount:[...owners.values()].filter(x=>x===uid).length,eventCount:userEvents.length,history:result.history,balances:result.balances});
 }
 const visible=ownerResults.find(x=>x.ownerId===current)??{ownerId:current,accountCount:0,eventCount:0,history:[],balances:[]};
 return {status:'OFFLINE_ISOLATION_FIXTURE_ONLY',visible,canPost:false,serverVerified:false,requiresAuthenticatedRlsTest:true};
}
