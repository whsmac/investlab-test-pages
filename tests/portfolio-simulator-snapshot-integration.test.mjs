import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPortfolioSimulatorSnapshot,comparePortfolioSimulatorSnapshot} from '../src/simulator/portfolio-snapshot.mjs';

function storageFor(holdings,watchlist=[],past=[]){
 const data=new Map(Object.entries({
  investlab_holdings:JSON.stringify(holdings),
  investlab_watchlist:JSON.stringify(watchlist),
  investlab_past_symbols:JSON.stringify(past)
 }));
 return {getItem:key=>data.get(key)??null,setItem:()=>{throw Error('read-only snapshot must not write')},removeItem:()=>{throw Error('read-only snapshot must not delete')}};
}

test('actual simulator import snapshot combines duplicate portfolio holdings by quantity-weighted cost',()=>{
 const storage=storageFor([
  {symbol:'TSLA',shares:6,avg_cost:180},
  {symbol:'TSLA',shares:4,avg_cost:210},
  {symbol:'SOXL',shares:4,avg_cost:25},
  {symbol:'TQQQ',shares:2,avg_cost:50},
  {symbol:'USD-CASH',shares:500,avg_cost:1}
 ],[{symbol:'MSFT'}]);
 const snapshot=readPortfolioSimulatorSnapshot(storage);
 assert.deepEqual(snapshot.positions,[
  {ticker:'SOXL',quantity:4,averageCost:25},
  {ticker:'TQQQ',quantity:2,averageCost:50},
  {ticker:'TSLA',quantity:10,averageCost:192}
 ]);
 assert.equal(snapshot.usdCash,500);
 assert.equal(snapshot.source,'SAME_ORIGIN_LOCAL_STORAGE_READ_ONLY');
 assert.equal(snapshot.crossDeviceSynced,false);
 assert.equal(snapshot.canPost,false);
 assert.equal(snapshot.serverVerified,false);
});

test('simulator detects changed portfolio positions and cash without modifying source',()=>{
 const before=readPortfolioSimulatorSnapshot(storageFor([
  {symbol:'TSLA',shares:10,avg_cost:192},
  {symbol:'USD-CASH',shares:500}
 ]));
 const after=readPortfolioSimulatorSnapshot(storageFor([
  {symbol:'TSLA',shares:8,avg_cost:192},
  {symbol:'USD-CASH',shares:900}
 ]));
 const diff=comparePortfolioSimulatorSnapshot({before,after});
 assert.deepEqual(diff.changedPositions,['TSLA']);
 assert.equal(diff.cashChanged,true);
 assert.equal(diff.canPost,false);
});

test('simulator UI loads portfolio snapshot on startup and manual refresh without persisting',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/import \{readPortfolioSimulatorSnapshot\} from '\.\/src\/simulator\/portfolio-snapshot\.mjs'/);
 const start=html.indexOf('function loadPortfolioPositions(){');
 const end=html.indexOf('let selectedOpeningReview=null;',start);
 assert.ok(start>=0&&end>start);
 const handler=html.slice(start,end);
 assert.match(handler,/readPortfolioSimulatorSnapshot\(window\.localStorage\)/);
 assert.match(handler,/portfolioState\.positions=positions\.map\(p=>\(\{\.\.\.p\}\)\)/);
 assert.match(handler,/if\(sourceCash!==null\)\{byId\('cash'\)\.value=String\(sourceCash\);\}/);
 assert.match(handler,/const known=new Set\(portfolioState\.prices\.map/);
 assert.match(handler,/if\(known\.has\(p\.ticker\)\)continue/);
 assert.match(html,/byId\('loadPortfolioPositions'\)\.addEventListener\('click',loadPortfolioPositions\);\s*loadPortfolioPositions\(\)/);
 assert.doesNotMatch(handler,/localStorage\.setItem|localStorage\.removeItem|supabase\.from\(/);
});

test('empty portfolio does not overwrite simulator cash or positions',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const start=html.indexOf('function loadPortfolioPositions(){');
 const end=html.indexOf('let selectedOpeningReview=null;',start);
 assert.ok(start>=0&&end>start);
 const handler=html.slice(start,end);
 const emptyGuard=handler.indexOf('if(!positions.length){');
 const cashApply=handler.indexOf("if(sourceCash!==null){byId('cash').value=String(sourceCash);}");
 const positionsApply=handler.indexOf('portfolioState.positions=positions.map');
 assert.ok(emptyGuard>=0&&cashApply>emptyGuard&&positionsApply>emptyGuard);
 const guardReturn=handler.indexOf('return;',emptyGuard);
 assert.ok(guardReturn>emptyGuard&&guardReturn<cashApply);
 assert.match(handler.slice(emptyGuard,guardReturn),/기존 보유정보·시작 현금·가정 주가·전략을 유지/);
});
