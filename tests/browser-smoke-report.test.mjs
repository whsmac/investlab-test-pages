import test from 'node:test';import assert from 'node:assert/strict';import {createBrowserSmokeReport as build} from '../src/ledger/browser-smoke-report.mjs';
const results=['NORMAL','QUANTITY','OWNERSHIP_COST','FILE_INTEGRITY'].map(caseId=>({caseId,status:'NOT_RUN',note:''}));
const create=(r=results)=>build({results:r,createdAt:'2026-11-13T00:00:00Z',environment:{browser:'Chrome',platform:'Windows'}});
test('not run cases never claim validation',()=>{const r=create();assert.equal(r.summary.notRun,4);assert.equal(r.verification,'MANUAL_SELF_REPORTED');assert.equal(r.canMigrate,false)});
test('mixed results counted',()=>{const r=create(results.map((x,i)=>({...x,status:i===0?'PASS':i===1?'FAIL':'NOT_RUN'})));assert.deepEqual(r.summary,{passed:1,failed:1,notRun:2})});
test('duplicate or missing case rejected',()=>assert.throws(()=>create([results[0],results[0],results[2],results[3]]),/invalid smoke case/));
test('invalid status rejected',()=>assert.throws(()=>create(results.map((x,i)=>i===0?{...x,status:'VERIFIED'}:x)),/invalid smoke case/));
test('long notes rejected',()=>assert.throws(()=>create(results.map((x,i)=>i===0?{...x,note:'x'.repeat(1001)}:x)),/invalid smoke case/));
