import {readFileSync} from 'node:fs';
import test from 'node:test';import assert from 'node:assert/strict';import {makeScenarioBackup,validateScenarioBackup,mergeScenarioBackup} from '../src/ledger/scenario-backup.mjs';
const sample={TSLA:[{name:'매도',trades:[{side:'sell',ticker:'TSLA',quantity:1,price:300,fee:0}]}]};
test('scenario backup round trips',()=>assert.deepEqual(validateScenarioBackup(makeScenarioBackup(sample,'2026-11-13T00:00:00Z')),sample));
test('invalid ticker blocked',()=>assert.throws(()=>validateScenarioBackup(makeScenarioBackup({bad:[{name:'bad',trades:[{side:'buy',ticker:'<script>',quantity:1,price:2}]}]},'x')),/거래/));
test('duplicate import does not overwrite',()=>assert.throws(()=>mergeScenarioBackup(sample,sample),/같은 이름/));
test('explicit overwrite supported',()=>assert.deepEqual({...mergeScenarioBackup(sample,sample,{overwrite:true})},sample));
test('unsafe property name rejected',()=>assert.throws(()=>makeScenarioBackup(JSON.parse('{"__proto__":[]}'),'x'),/안전하지/));
test('oversized backup rejected',()=>assert.throws(()=>makeScenarioBackup(Object.fromEntries(Array.from({length:31},(_,i)=>['S'+i,sample.TSLA])),'x'),/최대/));

test('target cash survives backup and import',()=>{
 const source={cashPlan:[{name:'TSLA to SOXL',targetCash:1000,trades:[{side:'sell',ticker:'TSLA',quantity:2,price:300,fee:0}]}]};
 const backup=makeScenarioBackup(source,'2026-11-13T00:00:00Z');
 assert.deepEqual(validateScenarioBackup(JSON.parse(JSON.stringify(backup))),source);
 assert.deepEqual({...mergeScenarioBackup({},source)},source);
});
test('invalid target cash is rejected without affecting legacy backups',()=>{
 for(const invalid of [-1,NaN,Infinity,'1000']){
  const bad={plan:[{name:'bad',targetCash:invalid,trades:[]}]};
  assert.throws(()=>makeScenarioBackup(bad,'x'),/전략 내용/);
 }
 assert.deepEqual(validateScenarioBackup(makeScenarioBackup(sample,'x')),sample);
});

test('backup import rejects duplicate strategy names inside one saved group',()=>{
 const duplicate={plan:[{name:'same',trades:[]},{name:'same',trades:[]}]};
 assert.throws(()=>makeScenarioBackup(duplicate,'x'),/중복된 전략 이름/);
 assert.throws(()=>validateScenarioBackup({format:'INVESTLAB_SIMULATOR_SCENARIO_BACKUP',version:1,scenarios:duplicate}),/중복된 전략 이름/);
});
test('backup rejects unsafe nested strategy names',()=>{
 for(const name of ['__proto__','constructor','prototype']){
  assert.throws(()=>makeScenarioBackup({plan:[{name,trades:[]}]},'x'),/전략 내용 오류/);
 }
});

test('merge rejects invalid incoming data even when a saved name already exists',()=>{
 const invalid={TSLA:[{name:'same',trades:[]},{name:'same',trades:[]}]};
 assert.throws(()=>mergeScenarioBackup(sample,invalid,{overwrite:true}),/중복된 전략 이름/);
 assert.deepEqual(sample.TSLA[0].name,'매도');
});
test('merge rejects corrupted current data even if overwritten by valid backup',()=>{
 const invalid={TSLA:[{name:'same',trades:[]},{name:'same',trades:[]}]};
 assert.throws(()=>mergeScenarioBackup(invalid,sample,{overwrite:true}),/중복된 전략 이름/);
 assert.deepEqual(sample.TSLA[0].name,'매도');
});

test('identical backup collisions preserve values and different collisions replace only matching keys',()=>{
 const original={TSLA:[{name:'매도',trades:[]}],SOXL:[{name:'매수',trades:[]}]};
 const incoming={TSLA:[{name:'매도',trades:[]}],SOXL:[{name:'변경',trades:[]}]};
 const before=JSON.stringify(original);
 const merged=mergeScenarioBackup(original,incoming,{overwrite:true});
 assert.equal(JSON.stringify(original),before);
 assert.deepEqual(merged.TSLA,original.TSLA);
 assert.equal(merged.SOXL[0].name,'변경');
 assert.equal(original.SOXL[0].name,'매수');
});

test('backup import reports invalid JSON clearly and skips no-op storage writes',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const start=html.indexOf("byId('importScenarios').addEventListener");
 const end=html.indexOf('function updateStrategySaveState()',start);
 const section=html.slice(start,end);
 assert.match(section,/try\{parsed=JSON\.parse\(await file\.text\(\)\);\}catch\{throw Error\('JSON 형식이 올바르지 않습니다/);
 assert.match(section,/const added=Object\.keys\(incoming\)\.filter\(name=>!Object\.hasOwn\(current,name\)\)/);
 assert.match(section,/if\(!collisions\.length&&!added\.length\)/);
 assert.match(section,/변경 없이 유지했습니다/);
 assert.ok(section.indexOf('if(!collisions.length&&!added.length)')<section.indexOf('localStorage.setItem(ownerStorageKey(SCENARIO_STORAGE_KEY)');
});

test('backup import distinguishes storage quota failures and retains file for retry',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const start=html.indexOf("byId('importScenarios').addEventListener");
 const end=html.indexOf('function updateStrategySaveState()',start);
 const section=html.slice(start,end);
 assert.match(section,/QuotaExceededError/);
 assert.match(section,/NS_ERROR_DOM_QUOTA_REACHED/);
 assert.match(section,/기존 저장 전략은 유지됩니다/);
 assert.match(section,/같은 파일로 다시 시도하세요/);
 assert.doesNotMatch(section,/scenarioBackupFile'\)\.value\s*=/);
});

test('backup import refreshes current editor save status on success and no-op',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const start=html.indexOf("byId('importScenarios').addEventListener");
 const end=html.indexOf('function updateStrategySaveState()',start);
 const section=html.slice(start,end);
 assert.match(section,/변경 없이 유지했습니다.*updateStrategySaveState\(\);return;/);
 assert.match(section,/localStorage\.setItem\(ownerStorageKey\(SCENARIO_STORAGE_KEY\),JSON\.stringify\(merged\)\);refreshSavedScenarioList\(\);updateStrategySaveState\(\)/);
});

test('save load and delete refresh editor saved status immediately',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const cases=[
  ["byId('saveScenario').addEventListener","byId('loadScenario').addEventListener",'브라우저 저장 완료'],
  ["byId('loadScenario').addEventListener","byId('appendScenario').addEventListener",'저장된 전략을 불러왔습니다'],
  ["byId('deleteScenario').addEventListener",'storageAction(refreshSavedScenarioList)','브라우저 전략 삭제 완료']
 ];
 for(const [startMarker,endMarker,message] of cases){
  const section=html.slice(html.indexOf(startMarker),html.indexOf(endMarker,html.indexOf(startMarker)));
  assert.ok(section.includes(message));
  assert.match(section,/updateStrategySaveState\(\);/);
  assert.ok(section.lastIndexOf('updateStrategySaveState();')>section.indexOf(message));
 }
});
