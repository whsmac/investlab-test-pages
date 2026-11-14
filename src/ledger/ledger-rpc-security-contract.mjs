// Offline review contract only: no SQL execution, database access, or posting.
// Treat this as a fail-closed checklist, not proof of PostgreSQL behavior.
export const POSTING_GATES=Object.freeze([
 'authenticated-owner-from-auth-uid',
 'account-owner-row-lock',
 'revoke-direct-client-writes',
 'revoke-public-anon-execute',
 'atomic-event-and-legs',
 'idempotent-request-payload-match',
 'nonnegative-cash-and-shares',
 'opening-only-once',
 'correction-by-reversal',
 'rollback-and-concurrency-tests',
 'authenticated-a-b-anon-tests'
]);
export function assessPostingRpcSecurity(spec){
 if(!spec||typeof spec!=='object'||Array.isArray(spec))throw Error('invalid RPC security specification');
 const declared=spec.controls;
 if(!declared||typeof declared!=='object'||Array.isArray(declared))throw Error('missing security controls');
 const missing=POSTING_GATES.filter(gate=>declared[gate]!==true);
 const extra=Object.keys(declared).filter(k=>!POSTING_GATES.includes(k));
 const unsafe=spec.browserServiceRoleKey===true||spec.directTableWrites===true||spec.sqlExecuted===true;
 if(unsafe)missing.push('unsafe deployment or client privilege declaration');
 return Object.freeze({status:missing.length?'BLOCKED':'DESIGN_CHECKLIST_COMPLETE_NOT_VERIFIED',missing,unknownControls:extra,canDeploy:false,canPost:false,serverVerified:false,requiresUserApproval:true});
}
