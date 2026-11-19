import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOnlineScenarioDraft as validate} from '../src/sync/test-online-scenario-validation.mjs';
const good={name:'TSLA 회전',steps:[{type:'SELL',ticker:'TSLA',quantity:3,price:200},{type:'BUY',ticker:'TQQQ',quantity:10,price:60}],assumptions:{targetCash:0,terminalPrices:{TSLA:220}}};
test('accepts hypothetical trades and keeps input unchanged',()=>{
 const before=JSON.stringify(good);const r=validate(good);
 assert.equal(r.valid,true);assert.equal(r.remoteWrite,false);assert.equal(r.payload.steps.length,2);assert.equal(JSON.stringify(good),before);
});
for(const [label,patch] of [
 ['real cash',{cashBalance:100}],['real positions',{positions:[]}],['actual transactions',{transactions:[]}],
 ['unknown assumption',{assumptions:{cash:0}}],['negative price',{steps:[{type:'BUY',ticker:'TSLA',quantity:1,price:-1}]}],
 ['invalid ticker',{steps:[{type:'BUY',ticker:'BAD TICKER',quantity:1,price:10}]}],
 ['invalid quantity',{steps:[{type:'BUY',ticker:'TSLA',quantity:0,price:10}]}],
 ['unknown step field',{steps:[{type:'BUY',ticker:'TSLA',quantity:1,price:10,accountId:'real'}]}],
 ['too many steps',{steps:Array.from({length:101},()=>good.steps[0])}],
 ['too many prices',{assumptions:{terminalPrices:Object.fromEntries(Array.from({length:301},(_,i)=>['X'+i,1]))}}]
])test('rejects '+label,()=>assert.throws(()=>validate({...good,...patch})));
test('rejects oversized document',()=>assert.throws(()=>validate({...good,name:'x'.repeat(81)})));
