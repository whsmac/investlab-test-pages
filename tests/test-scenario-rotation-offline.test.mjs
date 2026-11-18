import test from 'node:test';
import assert from 'node:assert/strict';
import {previewLegacySimulatorStrategies} from '../src/sync/test-legacy-simulator-preview.mjs';
import {reviewPersonalStorageDuplicates} from '../src/sync/personal-storage-dedup-policy.mjs';

// Offline-only realistic four-step rotation fixture; not an actual ledger event.
const baseline={positions:[{ticker:'TSLA',quantity:10,averageCost:100}],cash:'0',prices:[{ticker:'TSLA',price:200}]};
const scenario={name:'TSLA → TQQQ → TSLA (offline fixture)',targetCash:0,terminalPrices:{TSLA:200,TQQQ:60},trades:[
 {side:'sell',ticker:'TSLA',quantity:3,price:200,fee:0},
 {side:'buy',ticker:'TQQQ',quantity:10,price:60,fee:0},
 {side:'sell',ticker:'TQQQ',quantity:10,price:75,fee:0},
 {side:'buy',ticker:'TSLA',quantity:3,price:250,fee:0}
]};
test('four-step TSLA/TQQQ rotation converts without ledger-derived baseline duplication',()=>{
 const original={...structuredClone(baseline),strategies:[structuredClone(scenario)]};
 const before=JSON.stringify(original);
 const r=previewLegacySimulatorStrategies(original);
 assert.equal(r.reports.length,1);
 const item=r.reports[0];
 assert.equal(item.status,'preview_only');
 assert.equal(item.tradeCount,4);
 assert.deepEqual(item.hypotheticalSteps.map(x=>[x.type,x.ticker,x.quantity,x.price]),[
 ['SELL','TSLA',3,200],['BUY','TQQQ',10,60],['SELL','TQQQ',10,75],['BUY','TSLA',3,250]]);
 assert.deepEqual(item.assumptions,{targetCash:0,terminalPrices:{TSLA:200,TQQQ:60}});
 assert.equal(item.hypotheticalSteps.some(x=>Object.hasOwn(x,'cashBalance')||Object.hasOwn(x,'positions')),false);
 assert.equal(JSON.stringify(original),before);
 assert.equal(r.canPost,false);assert.equal(r.canOverwrite,false);assert.equal(r.canDelete,false);
});
test('offline trade sequence has consistent cash and holdings, but never claims live balance',()=>{
 const quantity={TSLA:10,TQQQ:0};let cash=0;
 for(const t of scenario.trades){
  const amount=t.quantity*t.price;
  if(t.side==='sell'){assert.ok(quantity[t.ticker]>=t.quantity);quantity[t.ticker]-=t.quantity;cash+=amount;}
  else{assert.ok(cash>=amount);quantity[t.ticker]+=t.quantity;cash-=amount;}
 }
 assert.deepEqual(quantity,{TSLA:10,TQQQ:0});assert.equal(cash,0);
 // Final example is arithmetically consistent: 600 - 600 + 750 - 750.
});
test('legacy baseline snapshots remain in source but are excluded from new personal settings',()=>{
 const r=reviewPersonalStorageDuplicates('portfolio',{watchlist:['TSLA','TQQQ'],positions:baseline.positions,cashBalance:0,averageCost:100});
 assert.deepEqual(r.kept,{watchlist:['TSLA','TQQQ']});
 assert.deepEqual(r.rejected.map(x=>x.field),['positions','cashBalance','averageCost']);
 assert.equal(r.canSave,false);assert.equal(r.canDelete,false);
});
test('invalid four-step fixture does not silently migrate',()=>{
 const broken=structuredClone(scenario);broken.trades[2].side='transfer';
 const r=previewLegacySimulatorStrategies({...baseline,strategies:[broken]});
 assert.equal(r.reports[0].status,'review_required');
});
