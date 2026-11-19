import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
test('desktop trade editor is explicitly on right independent of handoff panels',()=>{
 assert.match(html,/<section class="panel primary-trade-panel"><h2>가상 거래<\/h2>/);
 assert.match(html,/\.layout>\.primary-trade-panel\{grid-column:2;grid-row:1 \/ span 4/);
 assert.match(html,/\.layout>#testOnlineSimulatorImport,\.layout>#portfolioHandoff\{grid-column:1/);
});
test('responsive narrow screens restore normal flow',()=>{
 assert.match(html,/@media\(max-width:1050px\)\{\.layout>\.primary-trade-panel\{grid-column:auto;grid-row:auto\}\}/);
});
