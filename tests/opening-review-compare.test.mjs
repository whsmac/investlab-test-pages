import test from 'node:test';import assert from 'node:assert/strict';import {compareOpeningReviewExport as compare} from '../src/ledger/opening-review-compare.mjs';
const inputs={exportData:{holdings:[{symbol:'TSLA',shares:'1'}]},accounts:[],allocations:[],cash:[],costConfirmations:[]};
const saved={format:'INVESTLAB_TEST_OPENING_REVIEW',version:1,inputs,review:{status:'OPENING_REVIEW_REQUIRED'},reviewKind:'allocation',createdAt:'2026-11-12T00:00:00Z',serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
test('identical input reports match but still requires review',()=>{const r=compare({saved,currentInputs:structuredClone(inputs)});assert.equal(r.changes.length,0);assert.equal(r.canMigrate,false);assert.equal(r.status,'INPUTS_MATCH_REVIEW_AGAIN')});
test('changed quantity detected',()=>{const next=structuredClone(inputs);next.exportData.holdings[0].shares='2';const r=compare({saved,currentInputs:next});assert.deepEqual(r.changes.map(x=>x.field),['exportData'])});
test('changed confirmed cost detected',()=>{const r=compare({saved,currentInputs:{...inputs,costConfirmations:[{confirmedAverageCostUsd:'10'}]}});assert.equal(r.changes[0].field,'costConfirmations')});
test('object key order is not treated as change',()=>{const r=compare({saved,currentInputs:{...inputs,exportData:{holdings:[{shares:'1',symbol:'TSLA'}]}}});assert.equal(r.changes.length,0)});
test('unsafe saved authorization rejected',()=>assert.throws(()=>compare({saved:{...saved,canMigrate:true},currentInputs:inputs}),/unsafe/));
test('unknown export rejected',()=>assert.throws(()=>compare({saved:{...saved,version:2},currentInputs:inputs}),/unsupported/));
