import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPersonalStorageDuplicates} from '../src/sync/personal-storage-dedup-policy.mjs';
test('portfolio settings are separated from duplicated ledger-derived fields',()=>{
 const original={watchlist:['TSLA'],displayPreferences:{sort:'symbol'},holdings:[{symbol:'TSLA',quantity:1}],cashBalance:100,averageCost:200};
 const r=reviewPersonalStorageDuplicates('portfolio',original);
 assert.deepEqual(r.kept,{watchlist:['TSLA'],displayPreferences:{sort:'symbol'}});
 assert.deepEqual(r.rejected.map(x=>x.field),['holdings','cashBalance','averageCost']);
 assert.equal(original.cashBalance,100);assert.equal(r.canDelete,false);assert.equal(r.canSave,false);
});
test('scenario steps remain independent hypothetical data',()=>{
 const r=reviewPersonalStorageDuplicates('scenario',{name:'TSLA rotation',steps:[{type:'SELL',symbol:'TSLA',quantity:3}],positions:[{symbol:'TSLA',quantity:10}]});
 assert.equal(r.kept.steps[0].quantity,3);assert.deepEqual(r.rejected.map(x=>x.field),['positions']);
});
test('nested portfolio balance snapshots are rejected as a unit',()=>{
 const r=reviewPersonalStorageDuplicates('portfolio',{accountDisplay:{cashBalance:100,label:'A'},notes:'test'});
 assert.deepEqual(r.kept,{notes:'test'});assert.equal(r.needsReview,true);
});
test('unknown fields are not silently dropped from source',()=>{
 const p={customBrokerField:123};const r=reviewPersonalStorageDuplicates('portfolio',p);
 assert.equal(r.rejected.length,1);assert.equal(p.customBrokerField,123);
});
