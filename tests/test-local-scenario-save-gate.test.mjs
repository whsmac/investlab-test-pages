import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewLocalScenarioSave} from '../src/sync/test-local-scenario-save-gate.mjs';
const valid=[{name:'회전',trades:[{side:'sell',ticker:'TSLA',quantity:3,price:200,fee:0},{side:'buy',ticker:'TQQQ',quantity:10,price:60,fee:0}],targetCash:0,terminalPrices:{TSLA:200}}];
test('local save gate verifies trade steps without changing legacy strategy',()=>{
 const before=JSON.stringify(valid),r=reviewLocalScenarioSave(valid);
 assert.equal(r.valid,true);assert.equal(r.virtualTradeCount,2);
 assert.equal(r.legacyStorageUnchanged,true);assert.equal(r.remoteStorageEnabled,false);
 assert.equal(r.duplicateLedgerSnapshotSaved,false);assert.equal(JSON.stringify(valid),before);
});
test('local save gate refuses invalid trade side before save',()=>{
 assert.throws(()=>reviewLocalScenarioSave([{name:'bad',trades:[{side:'transfer'}]}]),/변환 점검 실패/);
});
test('simulator runs save gate before localStorage write',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const start=html.indexOf("byId('saveScenario').addEventListener");
 const review=html.indexOf('reviewLocalScenarioSave(strategies)',start);
 const write=html.indexOf('localStorage.setItem(ownerStorageKey(SCENARIO_STORAGE_KEY)',start);
 assert.match(html.slice(start,write),/requireActiveScenarioOwner\(\)/);
 assert.ok(start>0&&review>start&&write>review);
});
