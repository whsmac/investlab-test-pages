import test from 'node:test';import assert from 'node:assert/strict';import {buildAllocationFormInputs as build} from '../src/ledger/opening-allocation-form.mjs';
const a='11111111-1111-4111-8111-111111111111';
const base={accounts:[{id:a,name:'ISA',ownerConfirmed:true}],holdings:[{symbol:'TSLA',shares:'2',avg_cost:'100'}],positionRows:[{accountId:a,ticker:'TSLA',quantity:'2',averageCostUsd:'110',costConfirmed:true}],cashRows:[{accountId:a,currency:'USD',balance:'50'}]};
test('form maps explicit cost and cash',()=>{const r=build(base);assert.equal(r.allocations[0].quantity,'2');assert.equal(r.costConfirmations[0].confirmedAverageCostUsd,'110');assert.equal(r.cash[0].balance,'50')});
test('unchecked cost is never confirmed',()=>{const r=build({...base,positionRows:[{...base.positionRows[0],costConfirmed:false}]});assert.equal(r.costConfirmations.length,0)});
test('unknown account blocked',()=>assert.throws(()=>build({...base,positionRows:[{...base.positionRows[0],accountId:'22222222-2222-4222-8222-222222222222'}]}),/invalid position/));
test('duplicate account ticker blocked',()=>assert.throws(()=>build({...base,positionRows:[...base.positionRows,base.positionRows[0]]}),/duplicate position/));
test('duplicate cash blocked',()=>assert.throws(()=>build({...base,cashRows:[...base.cashRows,base.cashRows[0]]}),/duplicate cash/));

test('zero fractional quantity is rejected',()=>{for(const quantity of ['0','0.0','0.00000000'])assert.throws(()=>build({...base,positionRows:[{...base.positionRows[0],quantity}]}),/invalid position/)});
test('two-account split requires explicitly supplied rows',()=>{const b='22222222-2222-4222-8222-222222222222';const r=build({...base,accounts:[...base.accounts,{id:b,name:'연금',ownerConfirmed:true}],positionRows:[{...base.positionRows[0],quantity:'0.5'},{...base.positionRows[0],accountId:b,quantity:'1.5'}]});assert.deepEqual(r.allocations.map(x=>x.quantity),['0.5','1.5'])});
