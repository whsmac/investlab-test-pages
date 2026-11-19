import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewLegacySimulatorStrategies} from '../src/sync/test-legacy-simulator-preview.mjs';
test('legacy simulator trades convert to hypothetical steps without copying real holdings',()=>{
 const draft={cash:'18',positions:[{ticker:'TSLA',quantity:222,averageCost:100}],prices:[{ticker:'TSLA',price:379}],
  strategies:[{name:'회전매매',trades:[{side:'sell',ticker:'TSLA',quantity:3,price:400,fee:0}],targetCash:100,terminalPrices:{TSLA:450}}]};
 const before=JSON.stringify(draft),r=previewLegacySimulatorStrategies(draft);
 assert.equal(r.reports[0].status,'preview_only');
 assert.deepEqual(r.reports[0].hypotheticalSteps,[{type:'SELL',ticker:'TSLA',quantity:3,price:400,fee:0}]);
 assert.equal(r.reports[0].assumptions.targetCash,100);
 assert.equal(r.reports[0].hypotheticalSteps[0].positions,undefined);
 assert.equal(r.canPost,false);assert.equal(r.canDelete,false);
 assert.equal(JSON.stringify(draft),before);
});
test('invalid legacy trades require review rather than silent migration',()=>{
 const r=previewLegacySimulatorStrategies({strategies:[{name:'invalid',trades:[{side:'transfer'}]}]});
 assert.equal(r.reports[0].status,'review_required');
});
test('TEST simulator exposes a read-only preview control',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/id="legacyScenarioPreviewButton"/);
 assert.match(html,/previewLegacySimulatorStrategies\(currentWorkingDraft\(\)\)/);
});
