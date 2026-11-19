import test from 'node:test';
import assert from 'node:assert/strict';
import {mapLegacyHoldingsToOpening} from '../src/ledger/legacy-holdings-map.mjs';
const id='123e4567-e89b-12d3-a456-426614174000';
test('maps validated legacy rows to selected account',()=>{
 const r=mapLegacyHoldingsToOpening({holdings:[{symbol:'TSLA',shares:10,avg_cost:250}],accountId:id});
 assert.equal(r.status,'PREVIEW_ONLY_NOT_UPLOADED');assert.equal(r.positions[0].accountId,id);
});
test('unknown source shape blocks entire batch',()=>{
 const r=mapLegacyHoldingsToOpening({holdings:[{symbol:'TSLA',shares:10,avg_cost:250},{symbol:'SOXL',shares:2}],accountId:id});
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.positions.length,0);
});
test('invalid account mapping rejected',()=>{
 assert.throws(()=>mapLegacyHoldingsToOpening({holdings:[{symbol:'TSLA',shares:1,avg_cost:100}],accountId:'not-account'}));
});
test('duplicate ticker blocks entire batch',()=>{
 const r=mapLegacyHoldingsToOpening({holdings:[{symbol:'TSLA',shares:1,avg_cost:100},{symbol:'TSLA',shares:2,avg_cost:200}],accountId:id});
 assert.equal(r.status,'REVIEW_REQUIRED');
});
