import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expectedScenarioRlsAccess as allowed} from '../src/sync/test-scenario-rls-oracle.mjs';
const A='test-user-A',B='test-user-B';
test('two users may each access their own scenarios',()=>{
 for(const action of ['select','insert','update','delete']){
  assert.equal(allowed({actorId:A,ownerId:A,action}),true);
  assert.equal(allowed({actorId:B,ownerId:B,action}),true);
 }
});
test('cross-user access and owner substitution are denied by expected policy',()=>{
 for(const action of ['select','insert','update','delete']){
  assert.equal(allowed({actorId:A,ownerId:B,action}),false);
  assert.equal(allowed({actorId:B,ownerId:A,action}),false);
 }
 assert.equal(allowed({actorId:A,ownerId:A,action:'update',newOwnerId:B}),false);
 assert.equal(allowed({actorId:B,ownerId:B,action:'update',newOwnerId:A}),false);
});
test('anonymous identity denied',()=>{
 for(const action of ['select','insert','update','delete'])
  assert.equal(allowed({actorId:null,ownerId:A,action}),false);
});
test('acceptance plan explicitly warns that live RLS remains unverified',()=>{
 const plan=readFileSync(new URL('../docs/TEST-two-user-scenario-rls-acceptance.md',import.meta.url),'utf8');
 assert.match(plan,/NOT EXECUTED/);
 assert.match(plan,/not proof of live RLS isolation/);
 assert.match(plan,/explicit user approval/);
 assert.match(plan,/No service-role credentials in a browser/);
});
