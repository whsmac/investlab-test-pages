import test from 'node:test';import assert from 'node:assert/strict';import {assessOpeningAccountPlan} from '../src/ledger/opening-account-plan.mjs';
const id='11111111-1111-4111-8111-111111111111';const account={id,name:'TEST 계좌',ownerConfirmed:true};
const data={accounts:[account],positions:[{accountId:id,ticker:'USD',quantity:'2',averageCostUsd:'45.12'}],cash:[{accountId:id,currency:'USD',balance:'1000'}]};
test('account and holdings including USD ETF remain distinct from USD cash',()=>{const r=assessOpeningAccountPlan(data);assert.equal(r.status,'OFFLINE_PLAN_VALIDATED_NOT_SERVER_VERIFIED');assert.equal(r.openingRows.length,2);assert.equal(r.accounts[0].positions,1);assert.equal(r.accounts[0].cash,1);assert.equal(r.canUpload,false)});
test('unknown account blocks all opening rows',()=>assert.throws(()=>assessOpeningAccountPlan({...data,accounts:[{...account,id:'22222222-2222-4222-8222-222222222222'}]}),/unregistered/));
test('duplicate accounts blocked',()=>assert.throws(()=>assessOpeningAccountPlan({...data,accounts:[account,account]}),/duplicate/));
test('unconfirmed ownership remains review required',()=>{const r=assessOpeningAccountPlan({...data,accounts:[{...account,ownerConfirmed:false}]});assert.equal(r.status,'REVIEW_REQUIRED')});
test('zero historical cost flagged for review',()=>{const r=assessOpeningAccountPlan({...data,positions:[{...data.positions[0],averageCostUsd:'0'}]});assert.equal(r.status,'REVIEW_REQUIRED')});
test('empty opening rows remain review required',()=>{const r=assessOpeningAccountPlan({accounts:[account]});assert.equal(r.status,'REVIEW_REQUIRED')});
