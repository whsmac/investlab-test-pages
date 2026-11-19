// Pure offline contract checks. No RPC invocation or database access.
import {assessOpeningAccountPlan} from './opening-account-plan.mjs';
const REQUEST=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
export function validateAccountOnboardingRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid onboarding request');
 if('userId' in value||'ownerId' in value)throw Error('owner must come from authenticated server context');
 if(typeof value.requestId!=='string'||!REQUEST.test(value.requestId))throw Error('invalid request ID');
 if(typeof value.name!=='string'||!value.name.trim()||value.name.trim().length>100)throw Error('invalid account name');
 return {rpc:'investlab_create_account_v1',requestId:value.requestId,name:value.name.trim(),status:'OFFLINE_VALIDATED_ONLY',canExecute:false};
}
export function validateOpeningRpcPreview(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid opening request');
 if('userId' in value||'ownerId' in value)throw Error('owner must come from authenticated server context');
 if(typeof value.requestId!=='string'||!REQUEST.test(value.requestId))throw Error('invalid request ID');
 const plan=assessOpeningAccountPlan({accounts:value.accounts,positions:value.positions,cash:value.cash});
 if(plan.accounts.length!==1)throw Error('opening RPC must target exactly one account');
 if(plan.status!=='OFFLINE_PLAN_VALIDATED_NOT_SERVER_VERIFIED')throw Error('opening plan requires manual review');
 if(!plan.openingRows.length)throw Error('empty opening snapshot');
 return {rpc:'investlab_post_opening_v1',requestId:value.requestId,accountId:plan.accounts[0].id,rows:plan.openingRows,status:'OFFLINE_VALIDATED_ONLY',serverVerified:false,canExecute:false,canUpload:false};
}
