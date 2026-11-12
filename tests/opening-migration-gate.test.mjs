import test from 'node:test';import assert from 'node:assert/strict';
import {assessOpeningMigrationGate} from '../src/ledger/opening-migration-gate.mjs';
const id='123e4567-e89b-12d3-a456-426614174000';
const data={positions:[{accountId:id,ticker:'USD',quantity:'2',averageCostUsd:'83.6'}],cash:[{accountId:id,currency:'USD',balance:'100'},{accountId:id,currency:'KRW',balance:'3000'}]};
const all={accountOwnership:true,historicalCostBasis:true,cashBalances:true};
test('matching balances without confirmations stay blocked',()=>{const r=assessOpeningMigrationGate(data,data);assert.equal(r.status,'BLOCKED');assert.equal(r.missingConfirmations.length,3)});
test('all confirmations permit only TEST review, never upload',()=>{const r=assessOpeningMigrationGate(data,data,all);assert.equal(r.status,'READY_FOR_TEST_REVIEW');assert.equal(r.readyForUpload,false);assert.equal(r.uploadAuthorized,false)});
test('any cash mismatch blocks even if confirmed',()=>{const r=assessOpeningMigrationGate(data,{...data,cash:[{...data.cash[0],balance:'101'},data.cash[1]]},all);assert.equal(r.status,'BLOCKED');assert.equal(r.differences.length,1)});
test('empty snapshot cannot pass gate',()=>{const r=assessOpeningMigrationGate({positions:[],cash:[]},{positions:[],cash:[]},all);assert.equal(r.status,'BLOCKED')});
