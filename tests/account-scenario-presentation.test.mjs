import test from 'node:test';import assert from 'node:assert/strict';import {summarizeAccountScenarioResults as summarize} from '../src/simulator/account-scenario-presentation.mjs';
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
