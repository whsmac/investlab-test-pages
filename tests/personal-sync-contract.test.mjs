import test from 'node:test';
import assert from 'node:assert/strict';
import {PERSONAL_SYNC_FORMAT,validatePersonalSyncEnvelope,comparePersonalSyncRevision,reviewRemotePersonalDocument} from '../src/sync/personal-sync-contract.mjs';
const user='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const documentId='33333333-3333-4333-8333-333333333333';
const envelope=(overrides={})=>({format:PERSONAL_SYNC_FORMAT,version:1,userId:user,documentId,kind:'portfolio',revision:0,updatedAt:'2026-11-16T01:00:00Z',payload:{holdings:[]},...overrides});
test('personal sync contract accepts only matching authenticated owner and disables writes',()=>{
 const result=validatePersonalSyncEnvelope(envelope(),{authenticatedUserId:user});
 assert.equal(result.valid,true);assert.equal(result.canPost,false);assert.equal(result.serverVerified,false);
});
test('personal sync contract refuses cross-user, missing auth, invalid kind and unsafe versions',()=>{
 for(const [input,auth] of [[envelope({userId:other}),user],[envelope(),undefined],[envelope({kind:'admin'}),user],[envelope({revision:-1}),user],[envelope({payload:[]}),user],[envelope({documentId:'bad'}),user],[envelope({updatedAt:'bad'}),user]]){
  assert.throws(()=>validatePersonalSyncEnvelope(input,{authenticatedUserId:auth}));
 }
});
test('personal sync contract rejects oversized documents',()=>{
 assert.throws(()=>validatePersonalSyncEnvelope(envelope({payload:{notes:'x'.repeat(1024*1024)}}),{authenticatedUserId:user}),/1MiB/);
});
test('revision comparisons do not overwrite local or remote state',()=>{
 assert.deepEqual(['MATCH','LOCAL_AHEAD','REMOTE_AHEAD'],[[2,2],[3,2],[1,2]].map(([localRevision,remoteRevision])=>{
  const r=comparePersonalSyncRevision({localRevision,remoteRevision});
  assert.equal(r.autoOverwrite,false);assert.equal(r.canPost,false);return r.state;
 }));
 assert.throws(()=>comparePersonalSyncRevision({localRevision:-1,remoteRevision:0}));
});

test('matching remote owner kind document and revision yields a detached read-only snapshot',()=>{
 const remote=envelope({revision:2,payload:{holdings:[{ticker:'TSLA',quantity:3}]}});
 const result=reviewRemotePersonalDocument(remote,{authenticatedUserId:user,expectedKind:'portfolio',expectedDocumentId:documentId,localRevision:2});
 assert.equal(result.canApply,true);
 assert.equal(result.serverVerified,false);
 assert.equal(result.canPost,false);
 assert.equal(result.autoOverwrite,false);
 assert.deepEqual(result.payload,remote.payload);
 result.payload.holdings[0].quantity=99;
 assert.equal(remote.payload.holdings[0].quantity,3);
});
test('remote revision mismatch is quarantined rather than applied',()=>{
 for(const [local,remote] of [[1,2],[3,2]]){
  const result=reviewRemotePersonalDocument(envelope({revision:remote}),{authenticatedUserId:user,expectedKind:'portfolio',expectedDocumentId:documentId,localRevision:local});
  assert.equal(result.canApply,false);
  assert.equal(result.requiresReview,true);
  assert.equal(result.payload,null);
 }
});
test('remote sync rejects another owner, kind, or document ID',()=>{
 const options={authenticatedUserId:user,expectedKind:'portfolio',expectedDocumentId:documentId,localRevision:0};
 for(const remote of [envelope({userId:other}),envelope({kind:'ledger'}),envelope({documentId:other})]){
  assert.throws(()=>reviewRemotePersonalDocument(remote,options));
 }
});
