// TEST-only pure onboarding + opening + posting preview. No RPC calls or persistence.
import {validateAccountOnboardingRequest,validateOpeningRpcPreview} from './account-opening-rpc-contract.mjs';
import {reviewPostingBatch} from './ledger-posting-batch-review.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const own=(x)=>Object.prototype.hasOwnProperty.call(x,'ownerId')||Object.prototype.hasOwnProperty.call(x,'userId');
export function previewLedgerOnboarding({sessionUserId,account,requestId,positions=[],cash=[],committedEvents=[],proposedEvents=[]}){
 if(typeof sessionUserId!=='string'||!UUID.test(sessionUserId))throw Error('invalid session user ID');
 if(!account||typeof account!=='object'||own(account))throw Error('account owner must come from server authentication');
 if(typeof account.id!=='string'||!UUID.test(account.id))throw Error('invalid account ID');
 if(account.ownerConfirmed!==true)throw Error('account ownership confirmation required');
 const onboarding=validateAccountOnboardingRequest({requestId:requestId+'-account',name:account.name});
 const opening=validateOpeningRpcPreview({requestId:requestId+'-opening',accounts:[{id:account.id,name:account.name,ownerConfirmed:true}],positions,cash});
 if(committedEvents.length||proposedEvents.length){
  // New account opening is not committed: existing events may only be evaluated as a separate review.
  if(!committedEvents.length)throw Error('posting requires a committed opening event');
 }
 const posting=proposedEvents.length?reviewPostingBatch({sessionUserId,accounts:[{id:account.id,ownerId:sessionUserId}],committedEvents,proposedEvents}):null;
 return {status:'OFFLINE_PREVIEW_ONLY',accountId:account.id.toLowerCase(),onboarding,opening,posting,sequence:['authenticate','create-account','post-opening','post-subsequent-events'],canExecute:false,serverVerified:false,requiresApprovalBeforeDbChange:true};
}
