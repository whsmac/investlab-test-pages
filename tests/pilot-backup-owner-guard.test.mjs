import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {captureBackupOwner,assertBackupOwner,makeScenarioBackup,validateScenarioBackup,mergeScenarioBackup} from '../src/ledger/scenario-backup.mjs';
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const sample={test:[{name:'fixture',trades:[{side:'buy',ticker:'TSLA',quantity:2,price:100}]}]};
test('same verified owner and generation permit a backup',()=>{
 const ticket=captureBackupOwner(A,1);
 assert.equal(assertBackupOwner(ticket,A,1,A),true);
 assert.ok(Object.isFrozen(ticket));
});
test('anonymous or invalid generation cannot initiate a backup',()=>{
 for(const owner of [null,'',undefined])assert.throws(()=>captureBackupOwner(owner,1),/로그인/);
 assert.throws(()=>captureBackupOwner(A,-1),/로그인/);
});
test('account switch and server/local disagreement block operations',()=>{
 const t=captureBackupOwner(A,1);
 for(const args of [[B,2,B],[null,2,null],[A,1,B],[A,1,null]])assert.throws(()=>assertBackupOwner(t,...args),/계정이 변경/);
});
test('same-account logout and login invalidate in-flight operation',()=>{
 const t=captureBackupOwner(A,1);
 assert.throws(()=>assertBackupOwner(t,A,3,A),/계정이 변경/);
});
test('simulated asynchronous restore cannot mutate either account after switch',async()=>{
 const store=new Map([[A,JSON.stringify(sample)],[B,'{}']]);
 let owner=A,generation=1;
 const ticket=captureBackupOwner(owner,generation);
 let release;
 const fileRead=new Promise(resolve=>{release=resolve});
 const restore=async()=>{
  const incoming=validateScenarioBackup(JSON.parse(await fileRead));
  assertBackupOwner(ticket,owner,generation,owner);
  store.set(owner,JSON.stringify(mergeScenarioBackup(JSON.parse(store.get(owner)),incoming)));
 };
 const pending=restore();
 owner=B;generation++;
 release(JSON.stringify(makeScenarioBackup({newPlan:sample.test},'fixture')));
 await assert.rejects(pending,/계정이 변경/);
 assert.equal(store.get(A),JSON.stringify(sample));assert.equal(store.get(B),'{}');
});
test('legacy backup round trip remains compatible for same verified session',()=>{
 const t=captureBackupOwner(A,1);
 const incoming=validateScenarioBackup(JSON.parse(JSON.stringify(makeScenarioBackup(sample,'fixture'))));
 assertBackupOwner(t,A,1,A);
 assert.deepEqual({...mergeScenarioBackup({},incoming)},sample);
});
test('UI captures owner before async file read, verifies before reading and committing local data',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const section=html.slice(html.indexOf("byId('importScenarios').addEventListener"),html.indexOf('function updateStrategySaveState()'));
 const capture=section.indexOf('captureBackupOwner('),read=section.indexOf('await file.text()'),verify=section.indexOf('await requireActiveScenarioOwner()'),guard=section.indexOf('assertBackupOwner('),get=section.indexOf('getSavedScenarios()'),write=section.indexOf('localStorage.setItem(');
 assert.ok(capture>=0&&capture<read&&read<verify&&verify<guard&&guard<get&&get<write);
 assert.ok(section.lastIndexOf('assertBackupOwner(')<write&&section.lastIndexOf('assertBackupOwner(')>get);
 assert.match(html,/activeSimulatorOwnerId=nextId;\s*scenarioOwnerGeneration\+\+/);
 assert.doesNotMatch(section,/\.upsert\(|\.insert\(|\.delete\(|\.rpc\(/);
});
test('UI export rechecks verified owner before generating file',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const section=html.slice(html.indexOf("byId('exportScenarios').addEventListener"),html.indexOf("byId('importScenarios').addEventListener"));
 assert.ok(section.indexOf('captureBackupOwner(')<section.indexOf('await requireActiveScenarioOwner()'));
 assert.ok(section.indexOf('assertBackupOwner(')<section.indexOf('makeScenarioBackup('));
});
