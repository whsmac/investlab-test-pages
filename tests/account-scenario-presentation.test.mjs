import test from 'node:test';import assert from 'node:assert/strict';import {summarizeAccountScenarioResults as summarize,compareAccountRealizedGains} from '../src/simulator/account-scenario-presentation.mjs';
test('available first and sorted by delta',()=>{const r=summarize({rows:[{accountNames:['A'],results:[{name:'fail',status:'UNAVAILABLE',reason:'insufficient shares'},{name:'up',status:'CALCULATED',terminalValue:200,deltaVsHold:50},{name:'down',status:'CALCULATED',terminalValue:100,deltaVsHold:-10}]}]});assert.deepEqual(r.rows.map(x=>x.name),['up','down','fail']);assert.equal(r.available,2);assert.equal(r.unavailable,1);assert.equal(r.bestDelta,50)});
test('no successful result has no best delta',()=>{const r=summarize({rows:[{accountNames:['A'],results:[{name:'fail',status:'UNAVAILABLE',reason:'cash'}]}]});assert.equal(r.bestDelta,null)});

test('account realized gain is preserved separately from valuation delta',()=>{
 const result=summarize({rows:[{accountNames:['ISA'],results:[{name:'sale',status:'CALCULATED',terminalValue:1030,deltaVsHold:0,realizedPnL:40,finalCash:650,quantityChanges:[],steps:[]}]},{accountNames:['Other'],results:[{name:'sale',status:'CALCULATED',terminalValue:300,deltaVsHold:0,realizedPnL:55,finalCash:150,quantityChanges:[],steps:[]}]},{accountNames:['ISA','Other'],results:[{name:'blended',status:'CALCULATED',terminalValue:1330,deltaVsHold:0,realizedPnL:50,finalCash:800,quantityChanges:[],steps:[]}]}]});
 assert.equal(result.rows.find(r=>r.account==='ISA').realizedPnL,40);
 assert.equal(result.rows.find(r=>r.account==='Other').realizedPnL,55);
 assert.equal(result.rows.find(r=>r.account==='ISA + Other').realizedPnL,50);
 assert.equal(result.rows.filter(r=>r.account!=='ISA + Other').reduce((sum,r)=>sum+r.realizedPnL,0),95);
 assert.equal(result.rows.find(r=>r.account==='ISA').deltaVsHold,0);
});
test('unavailable account comparison has no realized gain',()=>{
 const result=summarize({rows:[{accountNames:['ISA'],results:[{name:'invalid',status:'UNAVAILABLE',reason:'cash',realizedPnL:100}]}]});
 assert.equal(result.rows[0].realizedPnL,null);
});

test('individual account gains are distinguished from blended average-cost gains',()=>{
 const rows=[
  {accountIds:['a'],accountNames:['ISA'],results:[{name:'sell',status:'CALCULATED',realizedPnL:40}]},
  {accountIds:['b'],accountNames:['Pension'],results:[{name:'sell',status:'CALCULATED',realizedPnL:55}]},
  {accountIds:['a','b'],accountNames:['ISA','Pension'],results:[{name:'sell',status:'CALCULATED',realizedPnL:100}]}
 ];
 const result=compareAccountRealizedGains({rows});
 assert.equal(result.length,1);
 assert.equal(result[0].accountSumRealizedPnL,95);
 assert.equal(result[0].blendedRealizedPnL,100);
 assert.equal(result[0].difference,5);
 assert.equal(result[0].hasDifference,true);
});
test('comparison is suppressed if an individual account failed or was omitted',()=>{
 const rows=[
  {accountIds:['a'],accountNames:['ISA'],results:[{name:'sell',status:'CALCULATED',realizedPnL:40}]},
  {accountIds:['b'],accountNames:['Pension'],results:[{name:'sell',status:'UNAVAILABLE',reason:'shares'}]},
  {accountIds:['a','b'],accountNames:['ISA','Pension'],results:[{name:'sell',status:'CALCULATED',realizedPnL:100}]}
 ];
 assert.deepEqual(compareAccountRealizedGains({rows}),[]);
 assert.deepEqual(compareAccountRealizedGains({rows:[rows[0],rows[2]]}),[]);
});

import {readFileSync} from 'node:fs';
test('simulator account comparison labels virtual USD gains and warns against automatic tax-basis use',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/실현손익 USD \(계좌 기준\)/);
 assert.match(html,/세금 신고용 원화 손익으로 자동 적용하지 않습니다/);
 assert.match(html,/실제 과세 대상 거래의 원화 기준 취득·양도금액/);
 assert.match(html,/compareAccountRealizedGains\(compared\)/);
});

test('online pilot account comparison respects selected accounts and clears stale file results',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const selected="const ids=[...byId('accountOpeningSelect').selectedOptions].map(o=>o.value)";
 assert.equal(html.split(selected).length-1,2);
 assert.match(html,/if\(!ids.length\)throw Error\('비교할 계좌를 하나 이상 선택하세요'\)/);
 assert.match(html,/option.selected=true;select.append\(option\)/);
 assert.match(html,/byId\('accountOpeningComparison'\).replaceChildren\(\);byId\('accountScenarioComparison'\).replaceChildren\(\)/);
});
