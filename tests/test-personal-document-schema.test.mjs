import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectTestPersonalDocumentSchema} from '../src/sync/test-personal-document-schema.mjs';
const url='https://gopofxyezhwpfxbecrxd.supabase.co';
const options={url,key:'sb_publishable_test',accessToken:'test-token'};
const response=(definitions)=>async()=>({ok:true,json:async()=>({definitions})});
test('existing personal document columns are reported without claiming RLS or writes',async()=>{
 const result=await inspectTestPersonalDocumentSchema({...options,fetchImpl:response({personal_documents:{properties:{user_id:{},document_id:{},envelope:{}}}})});
 assert.equal(result.readAdapterCompatible,true);assert.equal(result.rlsVerified,false);assert.equal(result.writesEnabled,false);
});
test('missing personal table and columns remain blocked',async()=>{
 const absent=await inspectTestPersonalDocumentSchema({...options,fetchImpl:response({})});
 assert.equal(absent.readAdapterCompatible,false);
 const partial=await inspectTestPersonalDocumentSchema({...options,fetchImpl:response({personal_documents:{properties:{user_id:{}}}})});
 assert.deepEqual(partial.missingColumns,['document_id','envelope']);
});
test('schema inspection refuses production endpoint and privileged keys',async()=>{
 await assert.rejects(inspectTestPersonalDocumentSchema({...options,url:'https://other.supabase.co'}),/주소 불일치/);
 await assert.rejects(inspectTestPersonalDocumentSchema({...options,key:'sb_secret_test'}),/공개용 키/);
});
test('TEST UI provides authenticated schema inspection without enabling persistence',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="personalDocumentSchema"/);
 assert.match(html,/inspectTestPersonalDocumentSchema\(/);
 assert.match(html,/RLS·쓰기 권한 미검증/);
});
