import test from 'node:test';
import assert from 'node:assert/strict';
import {POSTING_GATES,assessPostingRpcSecurity as assess} from '../src/ledger/ledger-rpc-security-contract.mjs';
const controls=()=>Object.fromEntries(POSTING_GATES.map(x=>[x,true]));
test('complete design checklist is never deployment authorization',()=>{
 const r=assess({controls:controls()});assert.equal(r.status,'DESIGN_CHECKLIST_COMPLETE_NOT_VERIFIED');
 assert.equal(r.canDeploy,false);assert.equal(r.serverVerified,false);assert.equal(r.requiresUserApproval,true);
});
test('rejects absent owner authentication, row lock, and rollback gates',()=>{
 const c=controls();delete c['authenticated-owner-from-auth-uid'];c['account-owner-row-lock']=false;c['rollback-and-concurrency-tests']=false;
 const r=assess({controls:c});assert.equal(r.status,'BLOCKED');assert.equal(r.missing.length,3);
});
test('unsafe client privileges or executed SQL always block',()=>{
 for(const flag of ['browserServiceRoleKey','directTableWrites','sqlExecuted']){
  assert.equal(assess({controls:controls(),[flag]:true}).status,'BLOCKED');
 }
});
test('no controls cannot silently pass',()=>assert.throws(()=>assess({}),/missing security controls/));
