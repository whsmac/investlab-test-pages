import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPortfolioSimulatorSnapshot,comparePortfolioSimulatorSnapshot} from '../src/simulator/portfolio-snapshot.mjs';
import {simulateTrades} from '../src/simulator/virtual-trade-engine.mjs';
import {compareScenarios} from '../src/simulator/scenario-comparison.mjs';

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
 assert.match(html,/byId\('loadPortfolioPositions'\)\.addEventListener\('click',\(\)=>\{\s*loadPortfolioPositions\(\);/);
 assert.match(html,/const added=ensureTradePrices\(\)/);
 assert.match(html,/\}\);\s*loadPortfolioPositions\(\);/);
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

function simulationOpening(snapshot){
 return {cash:snapshot.usdCash??0,positions:Object.fromEntries(snapshot.positions.map(p=>[p.ticker,{quantity:p.quantity,averageCost:p.averageCost}]))};
}

test('a saved sell strategy rejects insufficient shares after portfolio refresh without changing source snapshot',()=>{
 const oldSnapshot=readPortfolioSimulatorSnapshot(storageFor([{symbol:'TSLA',shares:10,avg_cost:192},{symbol:'USD-CASH',shares:100}]));
 const latestSnapshot=readPortfolioSimulatorSnapshot(storageFor([{symbol:'TSLA',shares:4,avg_cost:192},{symbol:'USD-CASH',shares:100}]));
 const strategy=[{side:'sell',ticker:'TSLA',quantity:6,price:200}];
 const oldResult=simulateTrades(simulationOpening(oldSnapshot),strategy);
 assert.equal(oldResult.final.positions.TSLA.quantity,4);
 assert.equal(oldResult.final.cash,1300);
 assert.throws(()=>simulateTrades(simulationOpening(latestSnapshot),strategy),/insufficient shares at 0/);
 assert.equal(latestSnapshot.positions[0].quantity,4);
 assert.equal(latestSnapshot.usdCash,100);
});

test('a saved buy strategy rejects insufficient cash after portfolio refresh',()=>{
 const oldSnapshot=readPortfolioSimulatorSnapshot(storageFor([{symbol:'TSLA',shares:2,avg_cost:180},{symbol:'USD-CASH',shares:1000}]));
 const latestSnapshot=readPortfolioSimulatorSnapshot(storageFor([{symbol:'TSLA',shares:2,avg_cost:180},{symbol:'USD-CASH',shares:100}]));
 const strategy=[{side:'buy',ticker:'TQQQ',quantity:5,price:100}];
 assert.equal(simulateTrades(simulationOpening(oldSnapshot),strategy).final.cash,500);
 assert.throws(()=>simulateTrades(simulationOpening(latestSnapshot),strategy),/insufficient cash at 0/);
 assert.equal(latestSnapshot.usdCash,100);
});

test('valid refreshed opening positions recalculate cash, quantity and realized P&L without ledger writes',()=>{
 const snapshot=readPortfolioSimulatorSnapshot(storageFor([{symbol:'TSLA',shares:5,avg_cost:180},{symbol:'USD-CASH',shares:200}]));
 const result=simulateTrades(simulationOpening(snapshot),[
  {side:'sell',ticker:'TSLA',quantity:2,price:210},
  {side:'buy',ticker:'TQQQ',quantity:3,price:100}
 ]);
 assert.equal(result.final.cash,320);
 assert.equal(result.final.positions.TSLA.quantity,3);
 assert.equal(result.final.positions.TQQQ.quantity,3);
 assert.equal(result.final.realizedPnL,60);
 assert.equal(snapshot.positions[0].quantity,5);
 assert.equal(snapshot.usdCash,200);
 assert.equal(result.taxStatus,'not_calculated');
});

test('scenario comparison identifies the exact failing strategy, trade and ticker after refresh',()=>{
 const opening=simulationOpening(readPortfolioSimulatorSnapshot(storageFor([
  {symbol:'TSLA',shares:4,avg_cost:192},{symbol:'USD-CASH',shares:100}
 ])));
 const terminalPrices={TSLA:200,TQQQ:100};
 const cases=[
  {name:'매도 초과',trades:[{side:'sell',ticker:'TSLA',quantity:2,price:200},{side:'sell',ticker:'TSLA',quantity:3,price:200}],index:1,reason:'insufficient shares',ticker:'TSLA'},
  {name:'현금 부족',trades:[{side:'buy',ticker:'TQQQ',quantity:1,price:50},{side:'buy',ticker:'TQQQ',quantity:2,price:100}],index:1,reason:'insufficient cash',ticker:'TQQQ'}
 ];
 for(const c of cases){
  assert.throws(()=>compareScenarios(opening,[{name:c.name,trades:c.trades}],terminalPrices),error=>{
   assert.equal(error.message,'scenario trade unavailable');
   assert.equal(error.scenarioName,c.name);
   assert.equal(error.tradeIndex,c.index);
   assert.equal(error.reason,c.reason);
   assert.equal(error.ticker,c.ticker);
   return true;
  });
 }
 assert.equal(opening.cash,100);
 assert.equal(opening.positions.TSLA.quantity,4);
});

test('simulator error UI shows failed strategy and trade and focuses its quantity input',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/const unavailable=e\.message==='scenario trade unavailable'&&Number\.isInteger\(e\.tradeIndex\)/);
 assert.match(html,/e\.scenarioName/);
 assert.match(html,/e\.tradeIndex\+1/);
 assert.match(html,/e\.ticker/);
 assert.match(html,/if\(unavailable\)focusFailedTrade\(e\)/);
 assert.match(html,/row\.classList\.add\('trade-error'\)/);
 assert.match(html,/row\.querySelector\('\[data-field="quantity"\]'\)\?\.focus/);
});
