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
 assert.match(html,/const priceDetails=document.createElement\\('details'\\)/);
 assert.match(html,/이 전략만의 최종 가정 주가/);
 assert.match(html,/terminalPrices:validateScenarioPrices/);
});
