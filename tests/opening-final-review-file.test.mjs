import test from 'node:test';import assert from 'node:assert/strict';import {buildFinalOpeningReviewFile as build,compareFinalOpeningReviewFile as compare} from '../src/ledger/opening-final-review-file.mjs';
const a='11111111-1111-4111-8111-111111111111';
const inputs={holdings:[{symbol:'TSLA',shares:'2'}],accounts:[{id:a,name:'ISA',ownerConfirmed:false}],positionRows:[{accountId:a,ticker:'TSLA',quantity:'2',costConfirmed:false}]};
const saved=build({inputs,createdAt:'2026-11-13T00:00:00.000Z'});
test('saved file remains offline-only',()=>{assert.equal(saved.format,'INVESTLAB_TEST_FINAL_OPENING_REVIEW');assert.equal(saved.canMigrate,false);assert.equal(saved.review.authorization,'NONE')});
test('resolved ownership and cost appear in comparison',()=>{const r=compare({saved,currentInputs:{...inputs,accounts:[{...inputs.accounts[0],ownerConfirmed:true}],positionRows:[{...inputs.positionRows[0],costConfirmed:true}]}});assert.equal(r.resolved.length,2);assert.equal(r.newIssues.length,0)});
test('new allocation shortfall appears',()=>{const r=compare({saved,currentInputs:{...inputs,positionRows:[{...inputs.positionRows[0],quantity:'1'}]}});assert.ok(r.newIssues.some(i=>i.type==='QUANTITY'))});
test('unsafe nested authorization rejected',()=>assert.throws(()=>compare({saved:{...saved,review:{...saved.review,canMigrate:true}},currentInputs:inputs}),/unsafe nested/));
test('unsupported format rejected',()=>assert.throws(()=>compare({saved:{...saved,format:'OTHER'},currentInputs:inputs}),/unsupported/));

test('tampered completion status is rejected',()=>assert.throws(()=>compare({saved:{...saved,review:{...saved.review,status:'OFFLINE_REVIEW_READY'}},currentInputs:inputs}),/does not match/));
test('deleted issues are rejected',()=>assert.throws(()=>compare({saved:{...saved,review:{...saved.review,issues:[]}},currentInputs:inputs}),/does not match/));
test('changed saved input without updated review is rejected',()=>assert.throws(()=>compare({saved:{...saved,inputs:{...inputs,accounts:[{...inputs.accounts[0],ownerConfirmed:true}]}},currentInputs:inputs}),/does not match/));
test('object key order does not affect validation',()=>{const reordered=JSON.parse(JSON.stringify(saved));reordered.review={authorization:reordered.review.authorization,...reordered.review};assert.equal(compare({saved:reordered,currentInputs:inputs}).newIssues.length,0)});
