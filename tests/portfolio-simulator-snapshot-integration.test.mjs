import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPortfolioSimulatorSnapshot,comparePortfolioSimulatorSnapshot} from '../src/simulator/portfolio-snapshot.mjs';
import {simulateTrades} from '../src/simulator/virtual-trade-engine.mjs';
import {compareScenarios} from '../src/simulator/scenario-comparison.mjs';
import {summarizeAccountScenarioResults} from '../src/simulator/account-scenario-presentation.mjs';

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

test('editing a failed strategy and retrying produces a clean successful recalculation',()=>{
 const opening=simulationOpening(readPortfolioSimulatorSnapshot(storageFor([
  {symbol:'TSLA',shares:4,avg_cost:192},{symbol:'USD-CASH',shares:100}
 ])));
 const prices={TSLA:200,TQQQ:100};
 const invalid={name:'재계산 검증',trades:[{side:'sell',ticker:'TSLA',quantity:5,price:200}]};
 assert.throws(()=>compareScenarios(opening,[invalid],prices),e=>e.message==='scenario trade unavailable'&&e.tradeIndex===0);
 const corrected={...invalid,trades:[{...invalid.trades[0],quantity:2}]};
 const result=compareScenarios(opening,[corrected],prices);
 assert.equal(result.scenarios[0].final.positions.TSLA.quantity,2);
 assert.equal(result.scenarios[0].final.cash,500);
 assert.equal(result.scenarios[0].final.realizedPnL,16);
 assert.equal(opening.positions.TSLA.quantity,4);
 assert.equal(opening.cash,100);
});

test('retry and input edit clear obsolete trade error highlighting before new results',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const editStart=html.indexOf('function invalidateCalculatedResults(){');
 const editEnd=html.indexOf('function trackSimulatorEdit(',editStart);
 const retryStart=html.indexOf('function refreshFxAndCalculate(){');
 const retryEnd=html.indexOf("byId('recalcNotice').hidden=true;",retryStart);
 assert.ok(editStart>=0&&editEnd>editStart&&retryStart>=0&&retryEnd>retryStart);
 assert.match(html.slice(editStart,editEnd),/clearTradeErrorHighlight\(\)/);
 assert.match(html.slice(retryStart,retryEnd),/clearTradeErrorHighlight\(\)/);
 assert.match(html,/if\(unavailable\)focusFailedTrade\(e\)/);
});

test('manual portfolio and account imports invalidate prior results and pending FX calculations',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const manual=html.slice(html.indexOf("byId('loadPortfolioPositions').addEventListener('click'"),html.indexOf('loadPortfolioPositions();\n\nconst editor=',html.indexOf("byId('loadPortfolioPositions').addEventListener('click'")));
 assert.match(manual,/simulatorInputRevision\+\+;\s*invalidateCalculatedResults\(\);\s*loadPortfolioPositions\(\)/);
 const account=html.slice(html.indexOf("byId('loadAccountOpening').addEventListener('click'"),html.indexOf("byId('loadPortfolioPositions').addEventListener('click'"));
 assert.match(account,/simulatorInputRevision\+\+;invalidateCalculatedResults\(\);portfolioState\.positions=opening\.positions/);
 const invalidate=html.slice(html.indexOf('function invalidateCalculatedResults(){'),html.indexOf('function trackSimulatorEdit(',html.indexOf('function invalidateCalculatedResults(){')));
 assert.match(invalidate,/byId\('resultHero'\)/);
 assert.match(invalidate,/fxRateSnapshot=null/);
 assert.match(invalidate,/byId\('status'\)\.textContent='입력값이 변경되었습니다/);
 assert.match(html,/if\(simulatorInputRevision!==inputRevisionAtStart\)throw new Error/);
});

test('two-account opening snapshots reconcile quantities, weighted cost, cash and simulated sales',()=>{
 const a=readPortfolioSimulatorSnapshot(storageFor([
  {symbol:'TSLA',shares:6,avg_cost:180},{symbol:'SOXL',shares:4,avg_cost:25},{symbol:'USD-CASH',shares:200}
 ]));
 const b=readPortfolioSimulatorSnapshot(storageFor([
  {symbol:'TSLA',shares:4,avg_cost:210},{symbol:'TQQQ',shares:2,avg_cost:50},{symbol:'USD-CASH',shares:300}
 ]));
 const combined=readPortfolioSimulatorSnapshot(storageFor([
  {symbol:'TSLA',shares:6,avg_cost:180},{symbol:'SOXL',shares:4,avg_cost:25},
  {symbol:'TSLA',shares:4,avg_cost:210},{symbol:'TQQQ',shares:2,avg_cost:50},
  {symbol:'USD-CASH',shares:200},{symbol:'USD-CASH',shares:300}
 ]));
 assert.equal(combined.usdCash,a.usdCash+b.usdCash);
 assert.deepEqual(combined.positions.find(p=>p.ticker==='TSLA'),{ticker:'TSLA',quantity:10,averageCost:192});
 assert.equal(combined.positions.find(p=>p.ticker==='SOXL').quantity,4);
 assert.equal(combined.positions.find(p=>p.ticker==='TQQQ').quantity,2);
 const trade=[{side:'sell',ticker:'TSLA',quantity:2,price:220}];
 const resultA=simulateTrades(simulationOpening(a),trade);
 const resultB=simulateTrades(simulationOpening(b),trade);
 const resultAll=simulateTrades(simulationOpening(combined),trade);
 assert.equal(resultA.final.cash,640);
 assert.equal(resultB.final.cash,740);
 assert.equal(resultAll.final.cash,940);
 assert.equal(resultAll.final.positions.TSLA.quantity,8);
 assert.equal(resultAll.final.realizedPnL,56);
 assert.equal(resultA.final.realizedPnL,80);
 assert.equal(resultB.final.realizedPnL,20);
 assert.equal(combined.positions.find(p=>p.ticker==='TSLA').quantity,10);
 assert.equal(combined.usdCash,500);
});

test('account opening import preserves price assumptions and invalidates previous valuation',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const start=html.indexOf("byId('loadAccountOpening').addEventListener('click'");
 const end=html.indexOf("byId('loadPortfolioPositions').addEventListener('click'",start);
 assert.ok(start>=0&&end>start);
 const handler=html.slice(start,end);
 assert.match(handler,/extractSimulatorCombinedOpening\(\{saved:selectedOpeningReview,accountIds:selectedIds\}\)/);
 assert.match(handler,/simulatorInputRevision\+\+;invalidateCalculatedResults\(\)/);
 assert.match(handler,/portfolioState\.positions=opening\.positions\.map/);
 assert.match(handler,/byId\('cash'\)\.value=String\(opening\.usdCash\)/);
 assert.match(handler,/const known=new Set\(portfolioState\.prices\.map/);
 assert.match(handler,/if\(!known\.has\(p\.ticker\)\)/);
 assert.match(handler,/renderPortfolio\(\)/);
});

test('account comparison table labels blended and individual cost basis separately',()=>{
 const presentation=summarizeAccountScenarioResults({rows:[
  {accountIds:['a'],accountNames:['계좌 A'],results:[{name:'매도',status:'CALCULATED',terminalValue:100,deltaVsHold:10,finalCash:50,cashChange:10,realizedPnL:10,quantityChanges:[],steps:[]}]},
  {accountIds:['a','b'],accountNames:['계좌 A','계좌 B'],results:[{name:'매도',status:'CALCULATED',terminalValue:200,deltaVsHold:20,finalCash:80,cashChange:20,realizedPnL:12,quantityChanges:[],steps:[]}]}
 ]});
 assert.equal(presentation.rows.find(r=>r.account==='계좌 A').accountBasis,'개별 계좌');
 assert.equal(presentation.rows.find(r=>r.account==='계좌 A + 계좌 B').accountBasis,'전체 합산 (가중평균)');
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/\['계좌','계산 기준','전략','실행 상태'/);
 assert.match(html,/const values=\[result\.account,result\.accountBasis,result\.name,available\?/);
});

test('account comparison presents opening cash alongside closing cash and change',()=>{
 const presentation=summarizeAccountScenarioResults({rows:[
  {accountIds:['a'],accountNames:['계좌 A'],usdCash:200,results:[{name:'매도',status:'CALCULATED',terminalValue:1000,deltaVsHold:20,finalCash:640,cashChange:440,realizedPnL:80,quantityChanges:[],steps:[]}]},
  {accountIds:['b'],accountNames:['계좌 B'],usdCash:300,results:[{name:'매도',status:'CALCULATED',terminalValue:1000,deltaVsHold:20,finalCash:740,cashChange:440,realizedPnL:20,quantityChanges:[],steps:[]}]},
  {accountIds:['a','b'],accountNames:['계좌 A','계좌 B'],usdCash:500,results:[{name:'매도',status:'CALCULATED',terminalValue:2000,deltaVsHold:40,finalCash:940,cashChange:440,realizedPnL:56,quantityChanges:[],steps:[]}]}
 ]});
 for(const [name,opening,closing] of [['계좌 A',200,640],['계좌 B',300,740],['계좌 A + 계좌 B',500,940]]){
  const row=presentation.rows.find(r=>r.account===name);
  assert.equal(row.openingCash,opening);
  assert.equal(row.finalCash,closing);
  assert.equal(row.cashChange,closing-opening);
 }
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 assert.match(html,/'시작 현금 USD','최종 현금 USD','현금 증감 USD'/);
 assert.match(html,/result\.openingCash\.toLocaleString\('ko-KR'/);
});

test('account scenario comparison table stays horizontally readable and emphasizes blended rows',()=>{
 const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const start=html.indexOf("const table=document.createElement('table');table.style.width='100%';table.style.minWidth='1100px'");
 assert.ok(start>=0);
 const end=html.indexOf('root.append(table);',start);
 assert.ok(end>start);
 const section=html.slice(start,end);
 assert.match(section,/table\.style\.minWidth='1100px'/);
 assert.match(section,/result\.accountBasis==='전체 합산 \(가중평균\)'/);
 assert.match(section,/tr\.dataset\.accountBasis=combinedBasis\?'combined':'individual'/);
 assert.match(section,/cell\.style\.textAlign='right'/);
 assert.match(section,/cell\.style\.fontVariantNumeric='tabular-nums'/);
 assert.match(section,/cell\.style\.whiteSpace='nowrap'/);
 assert.match(html,/id="accountScenarioComparison" style="overflow-x:auto"/);
});
