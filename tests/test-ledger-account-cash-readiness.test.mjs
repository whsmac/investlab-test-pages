import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectLedgerAccountCashReadiness} from '../src/sync/test-ledger-account-cash-readiness.mjs';
test('stock-only ledger cannot claim cash balance or account assignment',()=>{
 const r=inspectLedgerAccountCashReadiness([{transaction_type:'BUY',symbol:'TSLA',quantity:1,unit_price:100,currency:'USD',gross_amount:100}]);
 assert.equal(r.rows,1);assert.equal(r.accountTagged,0);assert.equal(r.cashRelated,0);assert.equal(r.canCalculateAccountCash,false);
 assert.ok(r.issues.some(x=>x.includes('계좌 식별')));
});
test('account and cash activity is detected but never treated as verified balance',()=>{
 const r=inspectLedgerAccountCashReadiness([{account_id:'account-a',transaction_type:'DEPOSIT',amount:100,currency:'USD'},{account_id:'account-a',transaction_type:'BUY',symbol:'TSLA'}]);
 assert.equal(r.accountCount,1);assert.equal(r.cashRelated,1);assert.equal(r.untagged,0);assert.equal(r.canCalculateAccountCash,false);assert.equal(r.canClaimRls,false);
});
test('TEST screen offers authenticated account/cash inspection without writes',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="testLedgerCashReadiness"/);
 assert.match(html,/inspectLedgerAccountCashReadiness\(result.rows\)/);
 assert.match(html,/실제 현금잔고 미산출/);
});
