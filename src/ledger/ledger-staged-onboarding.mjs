// Pure TEST-only staged onboarding plan. Never calls Supabase or mutates data.
import {validateAccountOnboardingRequest} from './account-opening-rpc-contract.mjs';
import {buildOpeningRpcHashPreview} from './opening-rpc-hash-preview.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
function clean(x){if(!x||typeof x!=='object'||Array.isArray(x))throw Error('invalid input');if('userId' in x||'ownerId' in x||'payloadHash' in x)throw Error('server identity and hash cannot be supplied');}
export function planAccountCreation({name,requestId}={}){
 const account=validateAccountOnboardingRequest({name,requestId});
 return Object.freeze({phase:'ACCOUNT_CREATION_REVIEW',rpc:account.rpc,args:Object.freeze({p_name:account.name,p_request_id:account.requestId}),next:'WAIT_FOR_AUTHENTICATED_SERVER_ACCOUNT_ID',canExecute:false,serverVerified:false});
}
export async function planOpeningAfterAccountCreated(input){
 clean(input);
 if(input.accountCreated!==true)throw Error('server account creation not confirmed');
 if(typeof input.accountId!=='string'||!UUID.test(input.accountId))throw Error('valid server-issued account ID required');
 if(typeof input.name!=='string'||!input.name.trim())throw Error('account name required');
 if(typeof input.requestId!=='string'||!REQUEST.test(input.requestId))throw Error('invalid opening request ID');
 if(input.ownerConfirmed!==true)throw Error('ownership confirmation required');
 const opening=await buildOpeningRpcHashPreview({
  requestId:input.requestId,
  accounts:[{id:input.accountId,name:input.name,ownerConfirmed:true}],
  positions:input.positions??[],cash:input.cash??[]
 });
 return Object.freeze({phase:'OPENING_REVIEW',rpc:opening.rpc,args:opening.args,canonicalPayload:opening.canonicalPayload,next:'WAIT_FOR_AUTHENTICATED_OPENING_RPC_CONFIRMATION',canExecute:false,serverVerified:false});
}
export function planLedgerPostingAfterOpening(input){
 clean(input);
 if(input.openingCommitted!==true)throw Error('opening RPC not confirmed committed');
 if(typeof input.accountId!=='string'||!UUID.test(input.accountId))throw Error('valid account ID required');
 if(typeof input.openingEventId!=='string'||!UUID.test(input.openingEventId))throw Error('valid committed opening event ID required');
 if(!Array.isArray(input.events)||!input.events.length)throw Error('posting events required');
 // No trade/cash RPC argument contract has been approved yet; avoid inventing an executable payload.
 return Object.freeze({phase:'POST_OPENING_REVIEW',accountId:input.accountId,openingEventId:input.openingEventId,eventCount:input.events.length,next:'REVIEW_TRADE_CASH_RPC_CONTRACTS',canExecute:false,serverVerified:false,requiresApprovalBeforeDbChange:true});
}
