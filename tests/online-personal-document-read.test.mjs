import test from 'node:test';
import assert from 'node:assert/strict';
import {readMyPersonalDocument} from '../src/sync/online-personal-document-read.mjs';
import {PERSONAL_SYNC_FORMAT} from '../src/sync/personal-sync-contract.mjs';
const user='11111111-1111-4111-8111-111111111111';
const id='33333333-3333-4333-8333-333333333333';
const envelope={format:PERSONAL_SYNC_FORMAT,version:1,userId:user,documentId:id,kind:'portfolio',revision:1,updatedAt:'2026-11-18T00:00:00Z',payload:{holdings:[]}};
function client(rows,authId=user){
 const calls=[];
 const query={select(v){calls.push(['select',v]);return this},eq(k,v){calls.push(['eq',k,v]);return this},async limit(n){calls.push(['limit',n]);return {data:rows,error:null}}};
 return {calls,auth:{async getUser(){return {data:{user:{id:authId}},error:null}}},from(table){calls.push(['from',table]);return query}};
}
const options={verifiedUserId:user,sessionUserId:user,documentId:id,kind:'portfolio',localRevision:1,table:'personal_documents'};
test('read-only owner-scoped query validates and returns matching snapshot',async()=>{
 const db=client([{user_id:user,document_id:id,envelope}]);
 const result=await readMyPersonalDocument(db,options);
 assert.equal(result.found,true);assert.equal(result.canApply,true);assert.equal(result.canPost,false);assert.equal(result.rlsVerified,false);
 assert.deepEqual(db.calls,[['from','personal_documents'],['select','user_id,document_id,envelope'],['eq','user_id',user],['eq','document_id',id],['limit',2]]);
});
test('read adapter rejects mismatched authentication before querying',async()=>{
 const db=client([], '22222222-2222-4222-8222-222222222222');
 await assert.rejects(readMyPersonalDocument(db,options),/재확인 실패/);
 assert.equal(db.calls.length,0);
});
test('read adapter rejects cross-owner, duplicates and unverified table names',async()=>{
 await assert.rejects(readMyPersonalDocument(client([{user_id:'other',document_id:id,envelope}]),options),/다른 사용자/);
 await assert.rejects(readMyPersonalDocument(client([{},{}]),options),/중복/);
 await assert.rejects(readMyPersonalDocument(client([]),{...options,table:'ledger_transactions;drop'}),/테이블/);
});
test('missing documents and revision conflicts never overwrite local data',async()=>{
 const missing=await readMyPersonalDocument(client([]),options);
 assert.equal(missing.found,false);assert.equal(missing.canApply,false);
 const conflict=await readMyPersonalDocument(client([{user_id:user,document_id:id,envelope}]),{...options,localRevision:2});
 assert.equal(conflict.canApply,false);assert.equal(conflict.payload,null);
});
