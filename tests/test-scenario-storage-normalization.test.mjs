import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTestScenarioDocument} from '../src/sync/test-scenario-storage-normalization.mjs';
test('scenario steps are retained, real holdings and cash are not duplicated',()=>{
 const original={name:'TSLA → TQQQ → TSLA',steps:[{type:'SELL',symbol:'TSLA',quantity:3},{type:'BUY',symbol:'TQQQ',quantity:2}],positions:[{symbol:'TSLA',quantity:10}],cashBalance:500};
 const result=prepareTestScenarioDocument(original,{sourceLedgerRevision:'ledger-v1'});
 assert.deepEqual(result.payload.steps,original.steps);
 assert.equal(result.payload.sourceLedgerRevision,'ledger-v1');
 assert.equal(result.payload.positions,undefined);
 assert.equal(result.payload.cashBalance,undefined);
 assert.deepEqual(result.omittedLegacyFields,['positions','cashBalance']);
 assert.equal(result.requiresReview,true);
 assert.equal(result.canPost,false);assert.equal(result.canOverwrite,false);
 assert.equal(original.cashBalance,500);
});
test('missing scenario name and invalid steps fail',()=>{
 assert.throws(()=>prepareTestScenarioDocument({name:'',steps:[]}),/이름/);
 assert.throws(()=>prepareTestScenarioDocument({name:'test',steps:[{type:'DEPOSIT'}]}),/매매 유형/);
});
test('no source snapshot means baseline is not verified',()=>{
 const r=prepareTestScenarioDocument({name:'test',steps:[{type:'BUY',symbol:'TSLA'}]});
 assert.equal(r.baselineSource,'UNVERIFIED');assert.equal(r.canDelete,false);
});
