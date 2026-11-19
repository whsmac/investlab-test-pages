import test from 'node:test';import assert from 'node:assert/strict';import {finalizeOpeningOfflineReview as finalize} from '../src/ledger/opening-final-review.mjs';
const a='11111111-1111-4111-8111-111111111111';
const base={holdings:[{symbol:'TSLA',shares:'2'}],accounts:[{id:a,name:'ISA',ownerConfirmed:true}],positionRows:[{accountId:a,ticker:'TSLA',quantity:'2',costConfirmed:true}]};
test('complete offline review never authorizes posting or migration',()=>{const r=finalize(base);assert.equal(r.status,'OFFLINE_REVIEW_READY');assert.equal(r.canPost,false);assert.equal(r.canMigrate,false);assert.equal(r.serverVerified,false);assert.equal(r.authorization,'NONE')});
test('unallocated quantity is a separate issue',()=>{const r=finalize({...base,positionRows:[{...base.positionRows[0],quantity:'1'}]});assert.equal(r.status,'OFFLINE_REVIEW_INCOMPLETE');assert.equal(r.issues[0].type,'QUANTITY')});
test('ownership and cost are separately actionable',()=>{const r=finalize({...base,accounts:[{...base.accounts[0],ownerConfirmed:false}],positionRows:[{...base.positionRows[0],costConfirmed:false}]});assert.deepEqual(r.issues.map(i=>i.type),['OWNERSHIP','COST'])});
test('missing positions cannot pass',()=>{const r=finalize({...base,positionRows:[]});assert.equal(r.status,'OFFLINE_REVIEW_INCOMPLETE');assert.ok(r.issues.some(i=>i.type==='POSITIONS'))});
