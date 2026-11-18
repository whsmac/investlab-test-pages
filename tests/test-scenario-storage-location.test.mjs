import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('online save remains disabled while personal documents API is unavailable',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/<button id="onlineScenarioSave" type="button" disabled/);
 assert.match(html,/id="scenarioStorageLocation"/);
 assert.match(html,/다른 PC\/모바일과 자동 동기화되지 않습니다/);
 assert.match(html,/reviewLocalScenarioSave\(strategies\)/);
});
