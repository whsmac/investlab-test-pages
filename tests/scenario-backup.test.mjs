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
