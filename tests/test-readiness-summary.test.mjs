import test from 'node:test';import assert from 'node:assert/strict';import {summarizeTestReadiness as ready} from '../src/ledger/test-readiness-summary.mjs';
test('no files leaves all permissions blocked',()=>{const r=ready();assert.equal(r.status,'TEST_REVIEW_INCOMPLETE');assert.equal(r.checks[0].status,'MISSING');assert.equal(r.checks[1].status,'MISSING');assert.equal(r.checks[2].status,'NOT_VERIFIED');assert.equal(r.canMigrate,false)});
test('unsafe files do not grant permissions',()=>{const r=ready({openingFile:{canMigrate:true},evidenceFile:{canPost:true}});assert.equal(r.checks[0].status,'INVALID');assert.equal(r.checks[1].status,'INVALID');assert.equal(r.serverVerified,false)});
test('server and migration remain pending regardless of offline state',()=>{const r=ready();assert.equal(r.checks[3].status,'NOT_AUTHORIZED');assert.equal(r.authorization,'NONE')});

test('missing and malformed evidence are distinct',()=>{const r=ready({openingFile:{invalid:true}});assert.equal(r.checks[0].status,'INVALID');assert.equal(r.checks[1].status,'MISSING')});
test('unlinked files never claim verified provenance',()=>{const r=ready();assert.equal(r.serverVerified,false);assert.equal(r.authorization,'NONE')});
