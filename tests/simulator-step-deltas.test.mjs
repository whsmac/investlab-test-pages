import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';import {simulateTrades} from '../src/simulator/virtual-trade-engine.mjs';
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
test('staged rotation cash changes and TSLA changes match step snapshots',()=>{
 const result=simulateTrades({cash:0,positions:{TSLA:{quantity:10,averageCost:100}}},[{side:'sell',ticker:'TSLA',quantity:5,price:200},{side:'buy',ticker:'SOXL',quantity:20,price:25},{side:'sell',ticker:'SOXL',quantity:20,price:35},{side:'buy',ticker:'TSLA',quantity:5,price:180}]);
 const changes=result.steps.map((step,i)=>step.cash-(i?result.steps[i-1].cash:result.initial.cash));
 const tslaChanges=result.steps.map(step=>(step.positions.TSLA?.quantity??0)-(result.initial.positions.TSLA?.quantity??0));
 assert.deepEqual(changes,[1000,-500,700,-900]);assert.deepEqual(tslaChanges,[-5,-5,-5,0]);
});
test('overview displays both deltas relative to proper reference',()=>{
 assert.match(html,/const previousCash=stepIndex===0\?initialCash:scenario\.steps\[stepIndex-1\]\.cash/);
 assert.match(html,/const tslaChange=tslaQuantity-initialTsla/);
 assert.match(html,/직전 단계 대비 현금 USD/);
 assert.match(html,/TSLA 보유 \/ 시작 대비/);
});
test('simulator script parses',()=>{const scripts=[...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)];assert.ok(scripts.length);for(const m of scripts){if(!m[1].trim())continue;const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:m[1],encoding:'utf8'});assert.equal(r.status,0,r.stderr);}});
