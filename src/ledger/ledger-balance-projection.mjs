// Offline balance projection from reviewed trade/cash RPC arguments.
// Never sends RPCs or writes account balances. Database remains authoritative.
import {previewTradeRpc,previewCashRpc} from './ledger-trade-cash-rpc-preview.mjs';
import {reviewPostingBatch} from './ledger-posting-batch-review.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function previewLedgerBalanceAfterTransaction({sessionUserId,accounts,committedEvents=[],transaction,eventId}={}){
 if(typeof eventId!=='string'||!UUID.test(eventId))throw Error('valid preview event ID required');
 if(!transaction||typeof transaction!=='object'||Array.isArray(transaction))throw Error('invalid transaction');
 const kind=transaction.kind;
 const {kind:ignored,...input}=transaction;
 const rpc=kind==='trade'?previewTradeRpc(input):kind==='cash'?previewCashRpc(input):null;
 if(!rpc)throw Error('unsupported transaction kind');
 const accountId=rpc.args.p_account_id;
 const proposedEvent={
  id:eventId.toLowerCase(),accountId,requestId:rpc.args.p_request_id,
  type:kind==='trade'?rpc.args.p_side:rpc.args.p_event_type,
  legs:rpc.legs.map(l=>({...l}))
 };
 const before=reviewExisting({sessionUserId,accounts,committedEvents,accountId});
 const after=reviewPostingBatch({sessionUserId,accounts,committedEvents,proposedEvents:[proposedEvent]});
 const key=accountId+' / ';
 const filtered=rows=>rows.filter(x=>x.accountAsset.startsWith(key));
 const old=new Map(filtered(before).map(x=>[x.accountAsset,x.balance]));
 const updated=filtered(after.balances);
 const changes=updated.map(x=>({accountAsset:x.accountAsset,before:old.get(x.accountAsset)??'0.00000000',after:x.balance}))
  .filter(x=>x.before!==x.after);
 return Object.freeze({
  status:'OFFLINE_BALANCE_PREVIEW_ONLY',rpc:rpc.rpc,args:rpc.args,
  accountId,transactionType:proposedEvent.type,
  beforeBalances:filtered(before),afterBalances:updated,changes,
  applied:after.applied,idempotentRetries:after.idempotentRetries,
  canPost:false,canPersist:false,serverVerified:false,
  requiresAccountLock:true,requiresAuthenticatedServerValidation:true
 });
}
function reviewExisting({sessionUserId,accounts,committedEvents,accountId}){
 // A zero-effect replay of an existing opening provides a filtered, immutable baseline
 // without adding a new transaction to the committed ledger.
 if(!Array.isArray(committedEvents))throw Error('committed events required');
 const own=accounts?.find(a=>a?.id?.toLowerCase()===accountId);
 if(!own||own.ownerId?.toLowerCase()!==sessionUserId?.toLowerCase())throw Error('cross-user posting forbidden');
 const filtered=committedEvents.filter(e=>e?.accountId?.toLowerCase()===accountId);
 if(!filtered.length)throw Error('opening event required before transaction');
 const opening=filtered.find(e=>e.type==='opening');
 if(!opening)throw Error('opening event required before transaction');
 const replay=reviewPostingBatch({sessionUserId,accounts,committedEvents,proposedEvents:[opening]});
 return replay.balances;
}
