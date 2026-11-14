import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTrades} from '../src/simulator/virtual-trade-engine.mjs';

const initial=()=>({cash:100,positions:{TSLA:{quantity:3,averageCost:100}}});
const cycle=[
 {side:'sell',ticker:'TSLA',quantity:2,price:200},
 {side:'buy',ticker:'SOXL',quantity:8,price:60},
 {side:'sell',ticker:'SOXL',quantity:8,price:125},
 {side:'buy',ticker:'TSLA',quantity:3,price:270}
];

test('pilot four-stage TSLA-SOXL cycle reconciles cash, shares and realized PnL',()=>{
 const portfolio=initial(),before=structuredClone(portfolio),trades=structuredClone(cycle);
 const r=simulateTrades(portfolio,trades);
 assert.deepEqual(r.steps.map(s=>s.cash),[500,20,1020,210]);
 assert.deepEqual(r.steps.map(s=>s.positions.TSLA.quantity),[1,1,1,4]);
 assert.equal(r.final.positions.SOXL.quantity,0);
 assert.equal(r.final.positions.TSLA.quantity,4);
 assert.equal(r.final.cash,210);
 assert.equal(r.final.realizedPnL,720);
 assert.equal(r.final.cash+4*270,1290);
 assert.equal(before.cash+before.positions.TSLA.quantity*270,910);
 assert.deepEqual(portfolio,before);
 assert.deepEqual(cycle,trades);
 assert.equal(r.taxStatus,'not_calculated');
});

test('pilot fees are reflected in cash and realized gain',()=>{
 const r=simulateTrades({cash:1000,positions:{TSLA:{quantity:2,averageCost:100}}},[
  {side:'sell',ticker:'TSLA',quantity:1,price:150,fee:2},
  {side:'buy',ticker:'SOXL',quantity:2,price:50,fee:1}
 ]);
 assert.deepEqual(r.steps.map(s=>s.cash),[1148,1047]);
 assert.equal(r.final.realizedPnL,48);
 assert.equal(r.final.positions.SOXL.averageCost,50.5);
});

test('pilot rejects insufficient funds and overselling without modifying source',()=>{
 const p=initial(),before=structuredClone(p);
 assert.throws(()=>simulateTrades(p,[{side:'buy',ticker:'SOXL',quantity:3,price:60}]),/insufficient cash/);
 assert.throws(()=>simulateTrades(p,[{side:'sell',ticker:'TSLA',quantity:4,price:200}]),/insufficient shares/);
 assert.deepEqual(p,before);
});

test('pilot empty strategy equals continue-holding baseline',()=>{
 const p=initial(),r=simulateTrades(p,[]);
 assert.equal(r.steps.length,0);
 assert.equal(r.final.cash,100);
 assert.equal(r.final.positions.TSLA.quantity,3);
 assert.equal(r.final.realizedPnL,0);
});
