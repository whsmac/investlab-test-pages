import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewTestCashMovements} from '../src/sync/test-cash-movement-review.mjs';
test('separates account and currency cash movements without claiming balances',()=>{
 const r=reviewTestCashMovements([
  {account_id:'A',transaction_type:'DEPOSIT',amount:1000,currency:'USD'},
  {account_id:'A',transaction_type:'WITHDRAWAL',amount:200,currency:'USD'},
  {account_id:'B',transaction_type:'DEPOSIT',amount:50000,currency:'KRW'},
  {account_id:'A',transaction_type:'BUY',gross_amount:300,currency:'USD'}
 ]);
 assert.equal(r.movements.length,2);assert.equal(r.movements[0].netRecordedMovement,800);
 assert.equal(r.movements[1].netRecordedMovement,50000);assert.equal(r.excluded,1);
 assert.equal(r.cashBalance,null);assert.equal(r.canApplyToSimulator,false);
});
test('missing account and ambiguous amount are excluded',()=>{
 const r=reviewTestCashMovements([
  {transaction_type:'DEPOSIT',amount:100,currency:'USD'},
  {account_id:'A',transaction_type:'DEPOSIT',amount:100,gross_amount:100,currency:'USD'},
  {account_id:'A',transaction_type:'FX',amount:100,currency:'USD'}
 ]);
 assert.equal(r.unknownAccount,1);assert.equal(r.unresolved,1);assert.equal(r.excluded,1);
 assert.equal(r.movements.length,0);
});
test('TEST screen keeps cash movement analysis read-only and labeled',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="testCashMovements"/);
 assert.match(html,/reviewTestCashMovements\(result.rows\)/);
 assert.match(html,/실제 현금잔고 미확인/);
});
