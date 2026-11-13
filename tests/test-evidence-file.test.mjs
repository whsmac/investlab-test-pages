import test from 'node:test';import assert from 'node:assert/strict';import {createBrowserSmokeReport} from '../src/ledger/browser-smoke-report.mjs';import {buildTestEvidenceFile as build,validateTestEvidenceFile as validate} from '../src/ledger/test-evidence-file.mjs';
const manualReport=createBrowserSmokeReport({results:['NORMAL','QUANTITY','OWNERSHIP_COST','FILE_INTEGRITY'].map(caseId=>({caseId,status:'PASS',note:''})),createdAt:'2026-11-13T00:00:00Z'});
const make=()=>build({manualReport,ci:{status:'success',reference:'run 206'},createdAt:'2026-11-13T01:00:00Z'});
test('valid combined file preserves offline-only flags',()=>{const r=validate(make());assert.equal(r.summary.status,'OFFLINE_TEST_EVIDENCE_REVIEWED');assert.equal(r.serverVerified,false);assert.equal(r.canMigrate,false)});
test('tampered summary rejected',()=>assert.throws(()=>validate({...make(),summary:{...make().summary,status:'SERVER_VERIFIED'}}),/inconsistent/));
test('tampered inputs without recomputed summary rejected',()=>assert.throws(()=>validate({...make(),inputs:{...make().inputs,ci:{status:'failure',reference:'run 206'}}}),/inconsistent/));
test('unsafe top level flag rejected',()=>assert.throws(()=>validate({...make(),canPost:true}),/unsafe/));
test('extra injected field rejected',()=>assert.throws(()=>validate({...make(),injected:'x'}),/inconsistent/));
test('invalid CI status rejected',()=>assert.throws(()=>build({manualReport,ci:{status:'verified',reference:''},createdAt:'2026-11-13T01:00:00Z'}),/invalid CI/));
