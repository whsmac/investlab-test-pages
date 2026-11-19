import test from 'node:test';import assert from 'node:assert/strict';import {validateReviewPairFiles as check,describeReviewPairResult as describe} from '../src/ledger/review-pair-browser.mjs';
const file=(size=100)=>({size,arrayBuffer:async()=>new ArrayBuffer(size)});
test('two selected files are accepted without server permissions',()=>{const r=check({openingFile:file(),evidenceFile:file()});assert.equal(r.files.length,2);assert.equal(r.canMigrate,false)});
test('missing file rejected',()=>assert.throws(()=>check({openingFile:file()}),/모두 선택/));
test('empty file rejected',()=>assert.throws(()=>check({openingFile:file(0),evidenceFile:file()}),/비어 있지 않은/));
test('oversize file rejected',()=>assert.throws(()=>check({openingFile:file(1048577),evidenceFile:file()}),/1MiB/));
test('invalid non-browser file rejected',()=>assert.throws(()=>check({openingFile:{size:3},evidenceFile:file()}),/브라우저/));
test('matching digest does not imply server verification',()=>assert.match(describe({matched:true,reviewerConfirmed:true}),/서버 검증 아님/));
test('mismatched digest reports discrepancy',()=>assert.match(describe({matched:false,reviewerConfirmed:true}),/불일치/));
