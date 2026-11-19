import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {probeTestPersonalDocumentRead} from '../src/sync/test-personal-document-read-probe.mjs';
const client=(error=null)=>({auth:{getUser:async()=>({data:{user:{id:'u1'}},error:null})},from:table=>({select:columns=>({eq:(key,value)=>({limit:async n=>{assert.equal(table,'personal_documents');assert.equal(columns,'user_id,document_id,envelope');assert.equal(key,'user_id');assert.equal(value,'u1');assert.equal(n,0);return {error};}})})})});
test('authenticated select only does not claim RLS or write access',async()=>{
 const r=await probeTestPersonalDocumentRead(client(),{verifiedUserId:'u1',sessionUserId:'u1'});
 assert.equal(r.status,'select_accepted');assert.equal(r.rlsVerified,false);assert.equal(r.writesEnabled,false);
});
test('missing table and permission errors are distinguished',async()=>{
 assert.equal((await probeTestPersonalDocumentRead(client({code:'PGRST205',message:'not found'}),{verifiedUserId:'u1',sessionUserId:'u1'})).status,'not_found');
 assert.equal((await probeTestPersonalDocumentRead(client({code:'42501',message:'permission denied'}),{verifiedUserId:'u1',sessionUserId:'u1'})).status,'permission_denied');
});
test('identity mismatch blocks query',async()=>{
 await assert.rejects(()=>probeTestPersonalDocumentRead(client(),{verifiedUserId:'u1',sessionUserId:'u2'}),/불일치/);
});
test('UI no longer calls OpenAPI metadata for personal document probe',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 const start=html.indexOf('$("personalDocumentSchema").onclick=async()=>{'),end=html.indexOf('$("onlineLedgerSchema").onclick=async()=>{',start);
 assert.match(html.slice(start,end),/probeTestPersonalDocumentRead/);
 assert.doesNotMatch(html.slice(start,end),/inspectTestPersonalDocumentSchema/);
});
