import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewLedgerColumnMapping} from '../src/sync/ledger-column-mapping.mjs';
const columns=[{column_name:'id',data_type:'uuid',is_nullable:'NO'},{column_name:'user_id',data_type:'uuid',is_nullable:'NO'}];
test('offline mapping identifies exact fields but never enables writes',()=>{
 const result=previewLedgerColumnMapping({transactions:[{id:'a',amount:10}]},columns);
 assert.equal(result.mapped[0].sourceField,'id');assert.equal(result.mapped[1].sourceField,null);
 assert.deepEqual(result.unmappedSourceFields,['amount']);assert.equal(result.canPost,false);assert.equal(result.canSync,false);assert.equal(result.schemaServerVerified,false);
});
test('mapping rejects absent or malformed column metadata',()=>{
 assert.throws(()=>previewLedgerColumnMapping({transactions:[]},[]),/컬럼/);
 assert.throws(()=>previewLedgerColumnMapping({transactions:[]},[columns[0],columns[0]]),/형식/);
 assert.throws(()=>previewLedgerColumnMapping({transactions:[null]},columns),/객체/);
});
test('mapping UI loads only a local JSON file and displays text safely',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 assert.match(html,/id="ledger-column-preview"/);assert.match(html,/previewLedgerColumnMapping\(current,columns/);
 assert.match(html,/li.textContent=item.column/);assert.match(html,/서버 저장 차단/);
});
