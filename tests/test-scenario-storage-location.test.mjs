import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('personal online strategy storage is enabled without a redundant save button',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="onlineScenarioSave"/);
 assert.match(html,/id="scenarioStorageLocation"/);
 assert.match(html,/await saveScenarioOnline\(name,strategies\)/);
 assert.match(html,/await deleteScenarioOnline\(name\)/);
 assert.match(html,/loadScenariosOnline\(\)/);
 assert.match(html,/reviewLocalScenarioSave\(strategies\)/);
});
