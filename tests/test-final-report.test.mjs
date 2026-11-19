import test from 'node:test';import assert from 'node:assert/strict';import {buildTestFinalReport,validateTestFinalReport} from '../src/ledger/test-final-report.mjs';
test('missing link blocks report',()=>assert.throws(()=>buildTestFinalReport({createdAt:'2026-11-13T00:00:00Z'}),/link/));
test('invalid date blocks report',()=>assert.throws(()=>buildTestFinalReport({createdAt:'invalid'}),/date/));
test('unsafe link blocks report',()=>assert.throws(()=>buildTestFinalReport({createdAt:'2026-11-13T00:00:00Z',link:{canMigrate:true}}),/unsafe/));

const hex='a'.repeat(64);
const report={format:'INVESTLAB_TEST_FINAL_OFFLINE_REPORT',version:1,createdAt:'2026-11-13T00:00:00Z',readiness:{status:'TEST_REVIEW_INCOMPLETE',checks:[{id:'OPENING',status:'MISSING'},{id:'EVIDENCE',status:'MISSING'},{id:'SERVER',status:'NOT_VERIFIED'},{id:'MIGRATION',status:'NOT_AUTHORIZED'}],serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'},link:{matched:false,reviewerConfirmed:false,openingDigest:hex,evidenceDigest:hex},status:'FINAL_REVIEW_INCOMPLETE',serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
test('incomplete offline report stays blocked',()=>{const r=validateTestFinalReport(report);assert.equal(r.canMigrate,false)});
test('unsafe report flags rejected',()=>assert.throws(()=>validateTestFinalReport({...report,canMigrate:true}),/unsafe/));
test('unsafe nested flags rejected',()=>assert.throws(()=>validateTestFinalReport({...report,readiness:{...report.readiness,serverVerified:true}}),/unsafe/));
test('fabricated completed status rejected',()=>assert.throws(()=>validateTestFinalReport({...report,status:'OFFLINE_FILES_REVIEWED_SERVER_PENDING'}),/inconsistent/));
test('invalid digest rejected',()=>assert.throws(()=>validateTestFinalReport({...report,link:{...report.link,openingDigest:'bad'}}),/link/));
test('server gate cannot be marked verified',()=>assert.throws(()=>validateTestFinalReport({...report,readiness:{...report.readiness,checks:[...report.readiness.checks.slice(0,2),{id:'SERVER',status:'READY'},report.readiness.checks[3]]}}),/unsafe/));
