import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLegacyHoldingsFile,MAX_IMPORT_BYTES} from '../src/ledger/legacy-file-import.mjs';
const accountId='123e4567-e89b-12d3-a456-426614174000';
test('accepts raw holdings JSON array',()=>{
 const r=parseLegacyHoldingsFile(JSON.stringify([{symbol:'TSLA',shares:10,avg_cost:250}]),accountId);
 assert.equal(r.positions.length,1);assert.equal(r.status,'PREVIEW_ONLY_NOT_UPLOADED');
});
test('accepts holdings wrapper object',()=>{
 const r=parseLegacyHoldingsFile(JSON.stringify({holdings:[{symbol:'SOXL',shares:'2',avg_cost:'40'}]}),accountId);
 assert.equal(r.positions[0].ticker,'SOXL');
});
test('rejects invalid file and unknown shapes',()=>{
 for(const s of ['{bad','{}','{"data":[]}','null','"hello"'])assert.throws(()=>parseLegacyHoldingsFile(s,accountId));
});
test('rejects oversized files',()=>assert.throws(()=>parseLegacyHoldingsFile(' '.repeat(MAX_IMPORT_BYTES+1),accountId)));
test('blocks entire batch when one holding is ambiguous',()=>{
 const r=parseLegacyHoldingsFile(JSON.stringify([{symbol:'TSLA',shares:1,avg_cost:250},{symbol:'SOXL',shares:2}]),accountId);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.positions.length,0);
});
