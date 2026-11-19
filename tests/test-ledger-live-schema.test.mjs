import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverTestLedgerColumns} from '../src/sync/test-ledger-live-schema.mjs';
const url='https://gopofxyezhwpfxbecrxd.supabase.co';
test('fetches TEST live ledger metadata with public key and auth',async()=>{
 let called=false;const result=await discoverTestLedgerColumns({url,key:'sb_publishable_test',accessToken:'token',fetchImpl:async (request,options)=>{called=true;assert.equal(request,url+'/rest/v1/');assert.equal(options.method,'GET');assert.equal(options.headers.apikey,'sb_publishable_test');return {ok:true,json:async()=>({definitions:{ledger_transactions:{required:['user_id'],properties:{user_id:{type:'string'},amount:{type:'number'}}}}})}}});
 assert.equal(called,true);assert.equal(result.columns.length,2);assert.equal(result.columns[0].required,true);assert.equal(result.writesEnabled,false);
});
test('rejects wrong project and missing schema',async()=>{
 await assert.rejects(()=>discoverTestLedgerColumns({url:'https://example.com',key:'anon',accessToken:'token'}),/불일치/);
 await assert.rejects(()=>discoverTestLedgerColumns({url,key:'sb_secret_test',accessToken:'token'}),/공개용/);
 await assert.rejects(()=>discoverTestLedgerColumns({url,key:'anon',accessToken:'token',fetchImpl:async()=>({ok:true,json:async()=>({definitions:{}})})}),/공개되지/);
});
test('live schema button is authenticated and read only',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="onlineLedgerSchema"[^>]*disabled/);assert.match(html,/discoverTestLedgerColumns\(/);assert.match(html,/"onlineLedgerSchema"\)\.disabled = !verifiedUserId/);
});
