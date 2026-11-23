import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
const pos=id=>html.indexOf('id="'+id+'"');

test('strategy actions follow create/load -> editor -> calculate/save, no duplicate buttons',()=>{
 for(const id of ['savedScenarioList','newScenario','loadScenario','strategyEditor','calculate','saveScenario']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(pos('savedScenarioList')<pos('newScenario'));
 assert.ok(pos('newScenario')<pos('strategyEditor'));
 assert.ok(pos('loadScenario')<pos('strategyEditor'));
 assert.ok(pos('strategyEditor')<pos('calculate'));
 assert.ok(pos('calculate')<pos('saveScenario'));
 assert.match(html,/class="strategy-action-buttons"/);
 assert.match(html,/class="strategy-action-rail"/);
 assert.match(html,/\.strategy-action-rail\{position:sticky;bottom:8px/);
 assert.match(html,/현재 전략 저장/);
});
test('new blank strategy is clearly separate from multi-strategy comparison',()=>{
 assert.match(html,/id="newScenario" type="button">\+ 새 전략 작성/);
 assert.match(html,/id="addStrategy" type="button">\+ 비교할 전략 추가/);
 assert.match(html,/byId\('newScenario'\)\.addEventListener\('click'/);
 assert.match(html,/strategyState=\[\{name,trades:\[\],terminalPrices:\{\}\}\]/);
 assert.match(html,/if\(hasEdits&&!confirm/);
 assert.match(html,/const used=new Set\(\[\.\.\.Object\.keys\(saved\),\.\.\.strategyState\.map/);
 assert.match(html,/scheduleWorkingDraft\(\);updateStrategySaveState\(\)/);
});
test('existing save/load and account safeguards are retained',()=>{
 for(const name of ['refreshSavedScenarioList','validateSavedStrategy','requireActiveScenarioOwner','saveScenarioOnline','loadScenariosOnline','getOnlineAccountOpening']){
  assert.ok(html.includes(name),name);
 }
 assert.match(html,/byId\('saveScenario'\)\.addEventListener\('click'/);
 assert.match(html,/byId\('loadScenario'\)\.addEventListener\('click'/);
 assert.match(html,/byId\('calculate'\)\.addEventListener\('click'/);
 assert.match(html,/id="refreshOnlineScenarios"/);
 assert.match(html,/id="pilotLedgerAccount"/);
 assert.match(html,/id="strategySaveState"/);
 assert.match(html,/id="appendScenario"/);
 assert.match(html,/id="deleteScenario"/);
});
test('responsive controls and keyboard calculation are retained',()=>{
 assert.match(html,/@media\(max-width:740px\)\{\.primary-trade-panel \.strategy-quickbar\{grid-template-columns:1fr/);
 assert.match(html,/\.strategy-action-buttons\{display:grid/);
 assert.match(html,/event\.metaKey\|\|event\.ctrlKey/);
 const scripts=[...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 for(const script of scripts){
  const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script[1],encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
 }
});
