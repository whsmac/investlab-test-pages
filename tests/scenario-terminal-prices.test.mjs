import test from 'node:test';
import assert from 'node:assert/strict';
import {compareScenarios} from '../src/simulator/scenario-comparison.mjs';
import {readFileSync} from 'node:fs';
test('independent terminal prices change scenario valuation without changing trades',()=>{
 const portfolio={cash:100,positions:{TSLA:{quantity:2,averageCost:50}}};
 const scenarios=[{name:'하락 -10%',trades:[],terminalPrices:{TSLA:90}},{name:'상승 +15%',trades:[],terminalPrices:{TSLA:115}}];
 const result=compareScenarios(portfolio,scenarios,{TSLA:100});
 assert.equal(result.scenarios[0].terminalValue,280);
 assert.equal(result.scenarios[1].terminalValue,330);
 assert.equal(result.scenarios[0].deltaVsHold,0);
 assert.equal(result.scenarios[1].deltaVsHold,0);
 assert.equal(result.baseline.terminalValue,300);
});
test('legacy scenarios use common price and different trades retain independent outcomes',()=>{
 const p={cash:1000,positions:{TSLA:{quantity:2,averageCost:50}}};
 const result=compareScenarios(p,[{name:'old',trades:[]},{name:'sell',trades:[{side:'sell',ticker:'TSLA',quantity:1,price:100,fee:0}],terminalPrices:{TSLA:90}}],{TSLA:100});
 assert.equal(result.scenarios[0].terminalValue,1200);
 assert.equal(result.scenarios[1].terminalValue,1190);
 assert.equal(result.scenarios[1].deltaVsHold,10);
});
test('UI includes independent strategy price editor and visible holdings',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/const priceDetails=document.createElement\('details'\)/);
 assert.match(html,/이 전략만의 최종 가정 주가/);
 assert.match(html,/terminalPrices:validateScenarioPrices/);
});

import {resolvePassiveTerminalPrices as resolvePassivePrices} from '../src/simulator/scenario-comparison.mjs';
test('unchanged holdings use fresh closes for valuation without modifying explicit assumptions',()=>{
 const positions={TSLA:{quantity:10,averageCost:300},TQQQ:{quantity:2,averageCost:40},BITU:{quantity:3,averageCost:10},USD:{quantity:4,averageCost:40}};
 const scenarios=[{name:'switch',trades:[{side:'sell',ticker:'TSLA',quantity:1,price:350},{side:'buy',ticker:'TQQQ',quantity:1,price:45}]}];
 const manualPrices={TSLA:350,TQQQ:45},closes=new Map([['BITU',7.5],['USD',40],['TSLA',330]]),dates=new Map([...closes.keys()].map(t=>[t,'2026-11-25'])),now=Date.parse('2026-11-26T01:00:00Z');
 const input={positions,scenarios,manualPrices,closes,dates,now},out=resolvePassivePrices(input);
 assert.deepEqual(out.missing,[]);assert.deepEqual(out.prices,{TSLA:350,TQQQ:45,BITU:7.5,USD:40});assert.deepEqual(manualPrices,{TSLA:350,TQQQ:45});
 assert.deepEqual(out.automatic.map(q=>q.ticker),['BITU','USD']);
 assert.deepEqual(resolvePassivePrices({...input,manualPrices:{TQQQ:45}}).missing,['TSLA']);
 assert.deepEqual(resolvePassivePrices({...input,now:Date.parse('2026-12-10T00:00:00Z')}).missing,['BITU','USD']);
 assert.equal(resolvePassivePrices({...input,manualPrices:{...manualPrices,BITU:0}}).prices.BITU,0);
});
