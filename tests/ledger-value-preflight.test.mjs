import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectLedgerTransactionValues} from '../src/sync/ledger-value-preflight.mjs';
test('optional numeric and date checks flag malformed values without writing',()=>{
 const ledger={transactions:[{amount:'100.50',trade_date:'2026-11-16'},{amount:'1,000',trade_date:'2026-02-30'},{quantity:Infinity}]};
 const before=JSON.stringify(ledger),result=inspectLedgerTransactionValues(ledger);
 assert.equal(result.rows,3);assert.equal(result.issueCount,3);
 assert.equal(result.canPost,false);assert.equal(result.requiredColumnsVerified,false);
 assert.equal(JSON.stringify(ledger),before);
});
test('unknown fields are not assumed to be DB required columns',()=>{
 const result=inspectLedgerTransactionValues({transactions:[{custom:'anything'}]});
 assert.equal(result.issueCount,0);assert.equal(result.dbSchemaVerified,false);
 assert.equal(inspectLedgerTransactionValues({transactions:[null]}).issueCount,1);
});
test('ledger preflight UI does not upload transaction data',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 assert.match(html,/id="ledger-value-preflight"/);
 assert.match(html,/inspectLedgerTransactionValues\(current/);
 assert.match(html,/li.textContent=issue.row/);
 assert.match(html,/필수 DB 컬럼 미확인 · 서버 저장 차단/);
});
