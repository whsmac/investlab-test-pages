import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalSnapshot,indexRows} from '../src/ledger/pilot-portfolio-history.mjs';
import {priceChange,reviewTrade} from '../src/market/pilot-visual-performance.mjs';
const buy={id:'a1',accountId:'a',date:'2025-01-02',type:'BUY',symbol:'AAA',qty:10,price:100,settlementAmount:1000,currency:'USD',brokerage:{format:'STATEMENT_V1'}};
const db={version:1,accounts:[{id:'a',name:'Synthetic'}],entries:[{id:'d',accountId:'a',date:'2025-01-01',type:'DEPOSIT',amount:1000,currency:'USD'},buy]};
const market=indexRows([{ticker:'AAA',date:'2025-01-02',close:50,as_traded_close:100,split_factor:2},{ticker:'AAA',date:'2025-01-03',close:55,as_traded_close:110,split_factor:2},{ticker:'AAA',date:'2025-01-06',close:60,as_traded_close:60,split_factor:1}]);
test('historical statement holdings use contemporaneous price, not retrospectively split-adjusted close',()=>{
 assert.equal(historicalSnapshot(db,'2025-01-02',market,'ALL','USD').total,1000);
 assert.equal(historicalSnapshot(db,'2025-01-03',market,'ALL','USD').total,1100);
 const missing=historicalSnapshot(db,'2025-01-06',market,'ALL','USD');assert.equal(missing.total,null);assert.match(missing.missing[0],/분할 검산/);
 assert.ok(Math.abs(priceChange(market,'AAA','2025-01-02','2025-01-06')-20)<1e-9);
 assert.ok(Math.abs(reviewTrade(buy,market,'2025-01-06').change-20)<1e-9);
});
test('no split basis must not silently value imported holdings',()=>{
 const r=historicalSnapshot(db,'2025-01-02',indexRows([{ticker:'AAA',date:'2025-01-02',close:50}]),'ALL','USD');
 assert.equal(r.total,null);assert.match(r.missing[0],/분할기준/);
});
