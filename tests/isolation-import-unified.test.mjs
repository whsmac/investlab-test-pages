import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeIsolationReviewImport} from '../src/ledger/isolation-import-unified.mjs';
import {ISOLATION_CASES,assessIsolationEvidence} from '../src/ledger/isolation-evidence-review.mjs';
import {buildIsolationEvidenceTemplate} from '../src/ledger/isolation-evidence-template.mjs';
test('simple review imports with unverified server state',()=>{const obj=assessIsolationEvidence(Object.fromEntries(ISOLATION_CASES.map(c=>[c.id,c.expected])));const r=normalizeIsolationReviewImport(JSON.stringify(obj));assert.equal(r.sourceFormat,'INVESTLAB_TEST_ISOLATION_REVIEW_V1');assert.equal(r.serverVerified,false)});
test('structured template imports without evidence',()=>{const r=normalizeIsolationReviewImport(JSON.stringify(buildIsolationEvidenceTemplate()));assert.equal(r.status,'INCOMPLETE');assert.equal(r.canMigrate,false)});
test('structured observation without reference remains unverified',()=>{const obj=buildIsolationEvidenceTemplate();obj.cases[0].observed='ALLOW';obj.cases[0].method='CLIENT_SESSION';const r=normalizeIsolationReviewImport(JSON.stringify(obj));assert.equal(r.evidence.a_own_read,null);assert.equal(r.issues.length,1)});
test('structured failure remains failure',()=>{const obj=buildIsolationEvidenceTemplate();obj.cases[1].observed='ALLOW';obj.cases[1].method='CLIENT_SESSION';obj.cases[1].evidenceReference='redacted-log';const r=normalizeIsolationReviewImport(JSON.stringify(obj));assert.equal(r.evidence.a_other_read,'ALLOW');assert.equal(r.status,'FAILED')});
test('unknown format fails closed',()=>assert.throws(()=>normalizeIsolationReviewImport(JSON.stringify({format:'OTHER'}))));
