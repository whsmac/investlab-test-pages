import test from 'node:test';import assert from 'node:assert/strict';import {simulateTrades} from '../src/simulator/virtual-trade-engine.mjs';
test('staged TSLA sale funds SOXL buy, SOXL exit and TSLA repurchase',()=>{
 const opening={cash:0,positions:{TSLA:{quantity:10,averageCost:100}}};
 const trades=[{side:'sell',ticker:'TSLA',quantity:5,price:200},{side:'buy',ticker:'SOXL',quantity:20,price:25},{side:'sell',ticker:'SOXL',quantity:20,price:35},{side:'buy',ticker:'TSLA',quantity:5,price:180}];
 const result=simulateTrades(opening,trades);
 assert.deepEqual(result.steps.map(s=>s.cash),[1000,500,1200,300]);
 assert.deepEqual(result.steps.map(s=>s.cumulativeRealizedPnL),[500,500,700,700]);
 assert.equal(result.final.positions.TSLA.quantity,10);
 assert.equal(result.final.positions.TSLA.averageCost,140);
 assert.equal(result.final.positions.SOXL.quantity,0);
 assert.equal(result.final.cash,300);
 assert.equal(result.final.realizedPnL,700);
 assert.equal(result.taxStatus,'not_calculated');
});
test('trade sequence cannot buy before sale provides cash',()=>{
 assert.throws(()=>simulateTrades({cash:0,positions:{TSLA:{quantity:10,averageCost:100}}},[{side:'buy',ticker:'SOXL',quantity:1,price:25}]),/insufficient cash at 0/);
});
test('sale cannot exceed held shares and leaves source unchanged',()=>{
 const source={cash:0,positions:{TSLA:{quantity:10,averageCost:100}}};
 assert.throws(()=>simulateTrades(source,[{side:'sell',ticker:'TSLA',quantity:11,price:200}]),/insufficient shares at 0/);
 assert.equal(source.positions.TSLA.quantity,10);
});
