// Static contract for TEST-only multi-user personal ledger. No database access.
export const PERSONAL_TABLES=Object.freeze(['investlab_accounts','investlab_ledger_events','investlab_ledger_legs','investlab_personal_symbols','investlab_personal_scenarios_v2']);
export const PERSONAL_RPC_PLAN=Object.freeze(['investlab_create_account_v1','investlab_post_opening_v1','investlab_post_trade_v2','investlab_post_cash_v1','investlab_reverse_event_v1','investlab_save_scenario_v1']);
export function assessLedgerSchemaCandidate(sql){
 if(typeof sql!=='string')throw Error('SQL text required');
 const problems=[];
 if(!/REVIEW ONLY|DO NOT EXECUTE/i.test(sql))problems.push('missing review-only label');
 if(!/\bbegin\s*;/i.test(sql)||!/\bcommit\s*;/i.test(sql))problems.push('missing transaction boundary');
 for(const name of PERSONAL_TABLES){
  if(!new RegExp('create\\s+table\\s+public\\.'+name+'\\s*\\(','i').test(sql))problems.push('missing table '+name);
  if(!new RegExp('alter\\s+table\\s+public\\.'+name+'\\s+enable\\s+row\\s+level\\s+security','i').test(sql))problems.push('missing RLS '+name);
  if(!new RegExp('alter\\s+table\\s+public\\.'+name+'\\s+force\\s+row\\s+level\\s+security','i').test(sql))problems.push('missing FORCE RLS '+name);
  if(!new RegExp('create\\s+policy\\s+\\w+\\s+on\\s+public\\.'+name+'\\s+for\\s+select\\s+to\\s+authenticated\\s+using\\s*\\(\\s*\\(select\\s+auth\\.uid\\(\\)\\)\\s*=\\s*user_id\\s*\\)','i').test(sql))problems.push('missing owner SELECT policy '+name);
 }
 if(!/foreign key\s*\(account_id,user_id\)\s*references\s+public\.investlab_accounts\(id,user_id\)/i.test(sql))problems.push('missing owner-scoped account FK');
 if(!/foreign key\s*\(event_id,user_id\)\s*references\s+public\.investlab_ledger_events\(id,user_id\)/i.test(sql))problems.push('missing owner-scoped event FK');
 if(!/revoke\s+all\s+on\s+public\.investlab_accounts[\s\S]*?from\s+public,anon,authenticated/i.test(sql))problems.push('missing table privilege revoke');
 if(/grant\s+(?:insert|update|delete|all)\s+on\s+public\.investlab_/i.test(sql))problems.push('unsafe direct client write grant');
 if(/create\s+(?:or\s+replace\s+)?function\s+public\.investlab_/i.test(sql))problems.push('RPC must be separately reviewed');
 return {status:problems.length?'STATIC_REVIEW_FAILED':'STATIC_REVIEW_PASSED_NOT_DEPLOYABLE',problems,tableCount:PERSONAL_TABLES.length,plannedRpcCount:PERSONAL_RPC_PLAN.length,canDeploy:false,serverVerified:false,requiresAuthenticatedABAnonTests:true};
}
