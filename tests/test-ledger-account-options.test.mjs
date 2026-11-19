import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {listTestLedgerAccounts} from '../src/sync/test-ledger-account-options.mjs';
test('only real account IDs appear, sorted, with transaction counts',()=>{
 const result=listTestLedgerAccounts([
  {account_id:'B'}, {account_id:'A'}, {account_id:'A'},
  {transaction_type:'BUY'}, {account_id:'A',portfolio_account_id:'B'}
 ]);
 assert.deepEqual(result.accounts,[{id:'A',transactions:2},{id:'B',transactions:1}]);
 assert.equal(result.unassigned,1);assert.equal(result.conflicting,1);assert.equal(result.canWrite,false);
});
test('account picker uses authenticated read and does not write',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 const start=html.indexOf('$("testLoadAccountOptions").onclick=async()=>{');
 const end=html.indexOf('$("testCashPreviewRun").onclick=async()=>{',start);
 assert.ok(start>=0&&end>start);
 const handler=html.slice(start,end);
 assert.match(handler,/readMyLedgerAll\(source/);
 assert.match(handler,/listTestLedgerAccounts\(result.rows\)/);
 assert.doesNotMatch(handler,/\.insert\(|\.upsert\(|\.update\(/);
 assert.match(html,/id="testCashPreviewAccount"/);
 assert.match(html,/\$\("testLoadAccountOptions"\)\.disabled = !verifiedUserId/);
});
