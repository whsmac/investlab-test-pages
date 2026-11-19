import test from 'node:test';import assert from 'node:assert/strict';
import {assessIsolationEvidence,ISOLATION_CASES} from '../src/ledger/isolation-evidence-review.mjs';
test('empty evidence remains incomplete',()=>{const r=assessIsolationEvidence();assert.equal(r.missing.length,8);assert.equal(r.canMigrate,false)});
test('expected observations are recorded but not server-verified',()=>{const evidence=Object.fromEntries(ISOLATION_CASES.map(c=>[c.id,c.expected]));const r=assessIsolationEvidence(evidence);assert.equal(r.status,'MANUAL_EVIDENCE_RECORDED');assert.equal(r.serverVerified,false);assert.equal(r.authorization,'NONE')});
test('cross-account read unexpectedly allowed fails',()=>{const evidence=Object.fromEntries(ISOLATION_CASES.map(c=>[c.id,c.expected]));evidence.a_other_read='ALLOW';const r=assessIsolationEvidence(evidence);assert.equal(r.status,'FAILED');assert.deepEqual(r.failures,['a_other_read'])});
test('invalid observation does not count as passed',()=>{const r=assessIsolationEvidence({anon_rpc:'PASS'});assert.ok(r.missing.includes('anon_rpc'))});
