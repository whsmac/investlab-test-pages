import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectLedgerShape} from '../src/sync/ledger-shape-inventory.mjs';
test('ledger inventory discovers fields without assuming DB columns or permitting writes',()=>{
 const input={transactions:[{id:'a',ticker:'TSLA'},{id:'b',amount:10}],accounts:[{currency:'USD'}]};
 const before=JSON.stringify(input),result=inspectLedgerShape(input);
 assert.equal(result.sourceRows,3);assert.deepEqual(result.sections[0].fields,['amount','id','ticker']);
 assert.equal(result.canPost,false);assert.equal(result.canSync,false);assert.equal(result.databaseColumnsVerified,false);assert.equal(JSON.stringify(input),before);
});
test('ledger inventory rejects non-object inputs and handles mixed array values',()=>{
 assert.throws(()=>inspectLedgerShape([]),/객체/);
 assert.throws(()=>inspectLedgerShape(null),/객체/);
 assert.equal(inspectLedgerShape({transactions:[null,1,{id:1}]}).sections[0].otherRows,2);
});
test('ledger field inventory UI uses textContent and no network writes',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 assert.match(html,/id="ledger-shape-preview"/);assert.match(html,/inspectLedgerShape\(current\)/);
 assert.match(html,/li.textContent=section.name/);assert.match(html,/DB 컬럼 미확인 · 서버 저장 차단/);
});
