import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessTestCashLedger} from '../src/sync/test-cash-ledger-completeness.mjs';
test('deposits and withdrawals alone do not establish a verified balance',()=>{
 const r=assessTestCashLedger([
  {account_id:'A',transaction_type:'DEPOSIT',amount:1000,currency:'USD'},
  {account_id:'A',transaction_type:'WITHDRAWAL',amount:200,currency:'USD'}
 ]);
 assert.equal(r.accounts[0].knownNetMovement,800);
 assert.equal(r.accounts[0].cashBalance,null);
 assert.equal(r.complete,false);assert.equal(r.canApplyToSimulator,false);
});
test('stock purchase and FX remain unresolved without settlement contract',()=>{
 const r=assessTestCashLedger([
  {account_id:'A',transaction_type:'BUY',symbol:'TSLA',quantity:1,unit_price:100,currency:'USD'},
  {account_id:'A',transaction_type:'FX',from_amount:100,to_amount:130000,currency:'USD'}
 ]);
 assert.equal(r.accounts[0].unresolved,2);
 assert.equal(r.issues.length,2);
});
test('missing account and ambiguous amount never silently contribute',()=>{
 const r=assessTestCashLedger([
  {transaction_type:'DEPOSIT',amount:100,currency:'USD'},
  {account_id:'A',transaction_type:'DEPOSIT',amount:100,gross_amount:100,currency:'USD'}
 ]);
 assert.equal(r.issues.length,2);
 assert.equal(r.accounts[0].knownNetMovement,0);
});
test('TEST UI shows completeness review without enabling cash application',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="testCashCompleteness"/);
 assert.match(html,/assessTestCashLedger\(result.rows\)/);
 assert.match(html,/실제 잔고 계산·시뮬레이터 적용 불가/);
});
