import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOpeningSnapshot} from '../src/ledger/opening-snapshot-preview.mjs';
const A='123e4567-e89b-12d3-a456-426614174000',B='123e4567-e89b-12d3-a456-426614174001';
test('separate accounts preserve same ticker and cash',()=>{
 const x=buildOpeningSnapshot({positions:[{accountId:A,ticker:'TSLA',quantity:'10',averageCostUsd:'250'},{accountId:B,ticker:'TSLA',quantity:'2',averageCostUsd:'300'}],cash:[{accountId:A,currency:'USD',balance:'5000'},{accountId:B,currency:'KRW',balance:'1000000'}]});
 assert.equal(x.rows.length,4);assert.equal(x.rows[0].quantity,'10.00000000');
 assert.equal(x.rows[2].balance,'5000.00000000');assert.equal(x.status,'PREVIEW_ONLY_NOT_UPLOADED');
});
test('duplicate account/ticker rejected',()=>assert.throws(()=>buildOpeningSnapshot({positions:[{accountId:A,ticker:'TSLA',quantity:'1',averageCostUsd:'100'},{accountId:A,ticker:'TSLA',quantity:'2',averageCostUsd:'100'}]}),/duplicate/));
test('invalid and ambiguous amounts rejected',()=>{
 for(const quantity of ['-1','1,000','1.000000001','0',1])assert.throws(()=>buildOpeningSnapshot({positions:[{accountId:A,ticker:'TSLA',quantity,averageCostUsd:'100'}]}));
});
test('cash currencies and duplicates validated',()=>{
 assert.throws(()=>buildOpeningSnapshot({cash:[{accountId:A,currency:'EUR',balance:'1'}]}));
 assert.throws(()=>buildOpeningSnapshot({cash:[{accountId:A,currency:'USD',balance:'1'},{accountId:A,currency:'USD',balance:'2'}]}));
});
test('input is not mutated',()=>{
 const x={positions:[{accountId:A,ticker:'TSLA',quantity:'1',averageCostUsd:'100'}],cash:[]};
 const before=JSON.stringify(x);buildOpeningSnapshot(x);assert.equal(JSON.stringify(x),before);
});
