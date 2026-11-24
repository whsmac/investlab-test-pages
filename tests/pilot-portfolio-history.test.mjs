import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ledgerAsOf,historicalSnapshot,indexRows,portfolioHistory,priorObservation} from '../src/ledger/pilot-portfolio-history.mjs';
const account={id:'a',name:'Synthetic account'};
const entries=[
 {id:'e1',date:'2026-11-20',accountId:'a',type:'OPEN',symbol:'TSLA',qty:2,price:100,currency:'USD'},
 {id:'e2',date:'2026-11-20',accountId:'a',type:'DEPOSIT',amount:100,currency:'USD'},
 {id:'e3',date:'2026-11-21',accountId:'a',type:'DEPOSIT',amount:50,currency:'USD'},
 {id:'e4',date:'2026-11-22',accountId:'a',type:'SELL',symbol:'TSLA',qty:1,price:120,currency:'USD'},
 {id:'e5',date:'2026-11-24',accountId:'a',type:'BUY',symbol:'TSLA',qty:1,price:130,currency:'USD'}];
const data={version:1,accounts:[account],entries};
const market=indexRows([{ticker:'TSLA',date:'2026-11-20',close:100},{ticker:'TSLA',date:'2026-11-22',close:120},{ticker:'TSLA',date:'2026-11-24',close:130},
 {ticker:'USDKRW',date:'2026-11-20',close:1300},{ticker:'USDKRW',date:'2026-11-22',close:1400},
 {ticker:'NDX',date:'2026-11-20',close:20000},{ticker:'NDX',date:'2026-11-22',close:22000}]);
test('as-of replays actual dated ledger without future trades or FX',()=>{
 const before=JSON.stringify(data);const a=historicalSnapshot(data,'2026-11-21',market,'ALL','KRW');
 assert.equal(a.holdings[0].qty,2);assert.equal(a.cash.USD,150);assert.equal(a.total,350*1300);assert.equal(a.fxDate,'2026-11-20');assert.equal(a.prices.get('TSLA').date,'2026-11-20');
 const b=historicalSnapshot(data,'2026-11-22',market,'ALL','USD');assert.equal(b.holdings[0].qty,1);assert.equal(b.cash.USD,270);assert.equal(b.total,390);
 assert.equal(ledgerAsOf(data,'2026-11-21').entries.length,3);assert.equal(JSON.stringify(data),before);
 assert.equal(historicalSnapshot(data,'2026-11-19',market).available,false);
});
test('cash-flow-adjusted index excludes deposit and preserves trade markers',()=>{
 const r=portfolioHistory(data,'2026-11-20','2026-11-24',market,'a','USD');
 assert.equal(r[0].index,100);assert.equal(r[1].total,350);assert.equal(r[1].index,100);assert.equal(r[1].capital,350);
 assert.ok(Math.abs(r[2].index-100*390/350)<1e-9);assert.equal(r[2].trades[0].type,'SELL');assert.equal(r[2].quantities.TSLA,1);
 assert.ok(Math.abs(r[2].ndx-110)<1e-9);assert.ok(Math.abs(r[4].ndx-110)<1e-9);
});
test('missing and stale observations never become partial totals',()=>{
 assert.equal(priorObservation(market.get('TSLA'),'2026-12-02'),null);
 const a=historicalSnapshot(data,'2026-12-05',market,'ALL','USD');assert.equal(a.total,null);assert.ok(a.missing.includes('TSLA'));
 const b=historicalSnapshot(data,'2026-11-20',new Map([['TSLA',market.get('TSLA')]]),'ALL','KRW');assert.equal(b.total,null);assert.ok(b.missing.includes('환율'));
 assert.throws(()=>portfolioHistory(data,'2020-01-01','2026-11-24',market));
});
test('date and trend controls use authenticated ledger, not current prices or hidden symbol duplicates',()=>{
 const h=readFileSync(new URL('../my-portfolio.html',import.meta.url),'utf8');
 for(const id of ['asOfDate','asOfQuery','historyStart','historyEnd','historyAssets','historyWeights','historyPerformance','historyDrawdown','historyTradePrices','historyFx'])assert.ok(h.includes('id="'+id+'"'));
 assert.match(h,/historicalSnapshot\(data,asOf,historyMarket/);
 assert.match(h,/prices:snapshot.prices,fx:snapshot.fx/);
 assert.match(h,/if\(gen!==historyGeneration\|\|owner!==displayedCloudLedgerOwnerId\)return/);
 assert.doesNotMatch(h,/id="portfolioWatchSymbols"|id="portfolioPastSymbols"/);
});
