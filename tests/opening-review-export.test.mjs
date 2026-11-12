import test from 'node:test';import assert from 'node:assert/strict';import {buildOpeningReviewExport as pack} from '../src/ledger/opening-review-export.mjs';
const base={review:{status:'OPENING_REVIEW_REQUIRED',canMigrate:false,serverVerified:false},inputs:{accounts:[{id:'a',name:'ISA'}]},reviewKind:'allocation',createdAt:'2026-11-12T00:00:00.000Z'};
test('export contains input snapshot and review with explicit offline safety',()=>{const r=pack(base);assert.equal(r.inputs.accounts[0].name,'ISA');assert.equal(r.authorization,'NONE');assert.equal(r.canPost,false);assert.equal(r.format,'INVESTLAB_TEST_OPENING_REVIEW')});
test('review cannot assert server verification',()=>assert.throws(()=>pack({...base,review:{serverVerified:true}}),/unsafe/));
test('review cannot assert migration permission',()=>assert.throws(()=>pack({...base,review:{canMigrate:true}}),/unsafe/));
test('review cannot assert posting permission',()=>assert.throws(()=>pack({...base,review:{canPost:true}}),/unsafe/));
test('invalid review type is rejected',()=>assert.throws(()=>pack({...base,reviewKind:'upload'}),/required/));
