import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileTestCashPreview} from '../src/sync/test-cash-reconciliation-preview.mjs';
const base={accountId:'A',currency:'USD',openingBalance:1000};
test('explicit buy and sell settlements, fees and withholding are calculated',()=>{
 const r=reconcileTestCashPreview([
 {account_id:'A',currency:'USD',transaction_type:'DEPOSIT',amount:100},
 {account_id:'A',currency:'USD',transaction_type:'BUY',gross_amount:300,fees:2,withholding_tax:0},
 {account_id:'A',currency:'USD',transaction_type:'SELL',gross_amount:200,fees:1,withholding_tax:5},
 {account_id:'B',currency:'USD',transaction_type:'DEPOSIT',amount:999}
 ],base);
 assert.equal(r.complete,true);assert.equal(r.knownMovement,-8);assert.equal(r.previewBalance,992);
 assert.equal(r.verified,false);assert.equal(r.canApplyToPortfolio,false);
});
test('unverified gross amount never inferred from shares and price',()=>{
 const r=reconcileTestCashPreview([{account_id:'A',currency:'USD',transaction_type:'BUY',quantity:1,unit_price:100,fees:0,withholding_tax:0}],base);
 assert.equal(r.complete,false);assert.equal(r.previewBalance,null);
 assert.match(r.issues[0].reason,/매매대금/);
});
test('missing fees, FX, other currency and unassigned rows block preview',()=>{
 const r=reconcileTestCashPreview([
 {account_id:'A',currency:'USD',transaction_type:'SELL',gross_amount:100,withholding_tax:0},
 {account_id:'A',currency:'USD',transaction_type:'FX',from_amount:100},
 {account_id:'A',currency:'KRW',transaction_type:'DEPOSIT',amount:100},
 {currency:'USD',transaction_type:'DEPOSIT',amount:100}
 ],base);
 assert.equal(r.complete,false);assert.equal(r.issues.length,4);assert.equal(r.previewBalance,null);
});
test('missing or nonnumeric opening balance rejected',()=>{
 assert.throws(()=>reconcileTestCashPreview([],{accountId:'A',currency:'USD'}),/시작잔고/);
 assert.throws(()=>reconcileTestCashPreview([],{...base,openingBalance:'1000'}),/시작잔고/);
});
