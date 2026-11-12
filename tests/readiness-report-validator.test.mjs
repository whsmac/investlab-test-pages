import test from 'node:test';import assert from 'node:assert/strict';
import {validateReadinessReport} from '../src/ledger/readiness-report-validator.mjs';
import {TEST_PREFLIGHT_CHECKS} from '../src/ledger/test-migration-preflight.mjs';
import {assessIsolationEvidence} from '../src/ledger/isolation-evidence-review.mjs';
function fixture(){const isolation=assessIsolationEvidence();return {format:'INVESTLAB_TEST_PREFLIGHT_REVIEW_V2',status:'BLOCKED',preflight:{checks:TEST_PREFLIGHT_CHECKS.map(c=>({...c,status:'NOT_VERIFIED'})),blockers:TEST_PREFLIGHT_CHECKS.map(c=>c.id),catalogStatus:'NOT_PROVIDED',catalogBlockers:['catalog audit not supplied']},isolation,isolationBlockers:[...isolation.failures,...isolation.missing],authorization:'NONE',serverVerified:false,canMigrate:false,canExecuteSql:false,canMerge:false}}
test('valid blocked report stays blocked',()=>{const r=validateReadinessReport(JSON.stringify(fixture()));assert.equal(r.status,'BLOCKED_PENDING_INDEPENDENT_VERIFICATION');assert.equal(r.catalogVerified,false)});
test('forged isolation PASS is rejected',()=>{const x=fixture();x.isolation.cases[0].status='PASS';assert.throws(()=>validateReadinessReport(x),/isolation status/)});
test('duplicate preflight ID rejected',()=>{const x=fixture();x.preflight.checks[1].id=x.preflight.checks[0].id;assert.throws(()=>validateReadinessReport(x),/duplicate/)});
test('missing preflight blocker rejected',()=>{const x=fixture();x.preflight.blockers=[];assert.throws(()=>validateReadinessReport(x),/blocker mismatch/)});
test('forged approval rejected',()=>{const x=fixture();x.canMigrate=true;assert.throws(()=>validateReadinessReport(x),/approval/)});
test('false completion claim rejected',()=>{const x=fixture();x.status='MANUAL_REVIEW_COMPLETE_NOT_SERVER_VERIFIED';assert.throws(()=>validateReadinessReport(x),/false completion/)});
