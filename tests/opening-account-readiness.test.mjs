import test from 'node:test';import assert from 'node:assert/strict';import {summarizeOpeningAccountReadiness as review} from '../src/ledger/opening-account-readiness.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const base={holdings:[{symbol:'TSLA',shares:'3'}],accounts:[{id:a,name:'ISA',ownerConfirmed:true},{id:b,name:'연금',ownerConfirmed:true}],positionRows:[{accountId:a,ticker:'TSLA',quantity:'1',costConfirmed:true},{accountId:b,ticker:'TSLA',quantity:'2',costConfirmed:true}]};
test('split holdings show two account rows and offline-only status',()=>{const r=review(base);assert.equal(r.rows.length,2);assert.equal(r.allReady,true);assert.equal(r.canMigrate,false);assert.equal(r.serverVerified,false)});
test('unconfirmed account ownership is visible',()=>{const r=review({...base,accounts:[{...base.accounts[0],ownerConfirmed:false},base.accounts[1]]});assert.equal(r.rows[0].ownership,'미확인');assert.equal(r.allReady,false)});
test('unconfirmed cost is visible for its specific account',()=>{const r=review({...base,positionRows:[base.positionRows[0],{...base.positionRows[1],costConfirmed:false}]});assert.equal(r.rows[1].cost,'미확인');assert.equal(r.missingCount,1)});
test('underallocated ticker blocks readiness',()=>{const r=review({...base,positionRows:[base.positionRows[0]]});assert.equal(r.rows[0].quantityStatus,'미배정');assert.equal(r.allReady,false)});
test('unknown account cannot appear as ready',()=>assert.throws(()=>review({...base,positionRows:[{...base.positionRows[0],accountId:'unknown'}]}),/unknown account/));
