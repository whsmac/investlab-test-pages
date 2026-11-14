// Bridge opening snapshot -> canonical RPC preview; no network, SQL, or persistence.
import {validateOpeningRpcPreview} from './account-opening-rpc-contract.mjs';
import {canonicalOpeningPayload,openingPayloadSha256} from './opening-payload-hash.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function buildOpeningRpcHashPreview(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid opening input');
 if('ownerId' in input||'userId' in input||'payloadHash' in input)throw Error('owner and payload hash must not be supplied by client');
 const reviewed=validateOpeningRpcPreview(input);
 if(typeof reviewed.accountId!=='string'||!UUID.test(reviewed.accountId))throw Error('invalid reviewed account');
 const rows=reviewed.rows.map(row=>{
  if(row.kind==='opening_cash')return {assetType:'cash',assetCode:row.currency,delta:row.balance};
  if(row.kind==='opening_position')return {assetType:'security',assetCode:row.ticker,delta:row.quantity,openingCostBasisUsd:row.averageCostUsd};
  throw Error('unknown opening row kind');
 });
 const payload={accountId:reviewed.accountId,requestId:reviewed.requestId,rows};
 const canonical=canonicalOpeningPayload(payload);
 const hash=await openingPayloadSha256(payload);
 return Object.freeze({
  rpc:reviewed.rpc,
  args:Object.freeze({p_account_id:reviewed.accountId,p_request_id:reviewed.requestId,p_rows:JSON.parse(canonical).rows,p_payload_hash:hash}),
  canonicalPayload:canonical,
  status:'OFFLINE_PREVIEW_ONLY_SERVER_HASH_NOT_VERIFIED',
  canExecute:false,serverVerified:false,
  blockingIssues:Object.freeze(['SQL v2 candidate and pgcrypto availability require PostgreSQL verification','database schema amendment, function owner/RLS permissions and A/B/anon tests not approved'])
 });
}
