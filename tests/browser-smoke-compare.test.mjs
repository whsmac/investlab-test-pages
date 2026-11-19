import test from 'node:test';import assert from 'node:assert/strict';import {createBrowserSmokeReport as make} from '../src/ledger/browser-smoke-report.mjs';import {compareBrowserSmokeReports as compare,validateBrowserSmokeReport as validate} from '../src/ledger/browser-smoke-compare.mjs';
const cases=['NORMAL','QUANTITY','OWNERSHIP_COST','FILE_INTEGRITY'];
const report=(statuses)=>make({results:cases.map((caseId,i)=>({caseId,status:statuses[i],note:''})),createdAt:'2026-11-13T00:00:00Z'});
test('saved report is accepted',()=>assert.equal(validate(report(['NOT_RUN','PASS','FAIL','NOT_RUN'])).results.length,4));
test('failed to passed is improvement',()=>{const r=compare({saved:report(['FAIL','PASS','PASS','NOT_RUN']),current:report(['PASS','PASS','PASS','NOT_RUN'])});assert.equal(r.improved,1);assert.equal(r.regressed,0)});
test('passed to failed is regression',()=>{const r=compare({saved:report(['PASS','PASS','PASS','PASS']),current:report(['FAIL','PASS','PASS','PASS'])});assert.equal(r.regressed,1)});
test('not run to pass is change but not failure recovery',()=>{const r=compare({saved:report(['NOT_RUN','PASS','PASS','PASS']),current:report(['PASS','PASS','PASS','PASS'])});assert.equal(r.changed,1);assert.equal(r.improved,0)});
test('tampered summary rejected',()=>assert.throws(()=>validate({...report(['PASS','PASS','PASS','PASS']),summary:{passed:4,failed:1,notRun:0}}),/summary mismatch/));
test('unsafe permission rejected',()=>assert.throws(()=>validate({...report(['PASS','PASS','PASS','PASS']),canMigrate:true}),/unsafe/));
