import test from 'node:test';import assert from 'node:assert/strict';import {readPortfolioSimulatorSnapshot,comparePortfolioSimulatorSnapshot} from '../src/simulator/portfolio-snapshot.mjs';
const storage=data=>({getItem:key=>JSON.stringify(data[key]??[])});
const data={investlab_holdings:[{symbol:'TSLA',shares:2,avg_cost:200},{symbol:'USD',shares:4,avg_cost:30},{symbol:'USD-CASH',shares:100,avg_cost:1}],investlab_watchlist:['SOXL','TSLA'],investlab_past_symbols:['TQQQ','SOXL']};
test('single source merges holdings, watchlist and trade history',()=>{const r=readPortfolioSimulatorSnapshot(storage(data));assert.deepEqual(r.symbols.find(x=>x.ticker==='TSLA').categories,['보유','관심']);assert.deepEqual(r.symbols.find(x=>x.ticker==='SOXL').categories,['관심','거래이력']);assert.equal(r.symbols.find(x=>x.ticker==='USD-CASH'),undefined)});
test('USD security is retained while cash is separate',()=>{const r=readPortfolioSimulatorSnapshot(storage(data));assert.equal(r.positions.find(x=>x.ticker==='USD').quantity,4);assert.equal(r.usdCash,100)});
test('snapshot is read-only and not server verified',()=>{let writes=0;const source={...storage(data),setItem:()=>writes++};const r=readPortfolioSimulatorSnapshot(source);assert.equal(writes,0);assert.equal(r.crossDeviceSynced,false);assert.equal(r.canPost,false)});
test('change detector identifies position and symbol changes',()=>{const before=readPortfolioSimulatorSnapshot(storage(data));const after=readPortfolioSimulatorSnapshot(storage({...data,investlab_holdings:[{symbol:'TSLA',shares:3,avg_cost:200}],investlab_watchlist:['TQQQ']}));const r=comparePortfolioSimulatorSnapshot({before,after});assert.ok(r.changedPositions.includes('TSLA'));assert.ok(r.changedSymbols.includes('SOXL'));assert.equal(r.cashChanged,true)});

import {compareScenarios} from '../src/simulator/scenario-comparison.mjs';
test('portfolio snapshot flows into simulator without changing source holdings or cash',()=>{
 const values={investlab_holdings:[{symbol:'TSLA',shares:2,avg_cost:200},{symbol:'USD-CASH',shares:100,avg_cost:1}],investlab_watchlist:['SOXL'],investlab_past_symbols:['TQQQ']};
 const before=JSON.stringify(values);
 let writes=0;
 const source={getItem:key=>JSON.stringify(values[key]??[]),setItem:()=>{writes++;throw Error('unexpected write');}};
 const snapshot=readPortfolioSimulatorSnapshot(source);
 const positions=Object.fromEntries(snapshot.positions.map(p=>[p.ticker,{quantity:p.quantity,averageCost:p.averageCost}]));
 const result=compareScenarios({cash:snapshot.usdCash,positions},[{name:'TSLA partial sale',trades:[{side:'sell',ticker:'TSLA',quantity:1,price:300,fee:0}]}],{TSLA:300});
 assert.equal(result.baseline.terminalValue,700);
 assert.equal(result.scenarios[0].final.cash,400);
 assert.equal(result.scenarios[0].final.positions.TSLA.quantity,1);
 assert.equal(result.scenarios[0].terminalValue,700);
 assert.equal(result.scenarios[0].deltaVsHold,0);
 assert.equal(JSON.stringify(values),before);
 assert.equal(writes,0);
 assert.equal(snapshot.serverVerified,false);
 assert.equal(snapshot.canPost,false);
});

import {readFileSync} from 'node:fs';
test('portfolio pilot diagnostics use read-only snapshot and disclose sync limits',()=>{
 const html=readFileSync(new URL('../portfolio-connection-check.html',import.meta.url),'utf8');
 assert.match(html,/readPortfolioSimulatorSnapshot\(localStorage\)/);
 assert.match(html,/snapshot\.positions\.length/);
 assert.match(html,/snapshot\.crossDeviceSynced/);
 assert.match(html,/snapshot\.serverVerified/);
 assert.match(html,/snapshot\.canPost/);
 assert.match(html,/다른 도메인\/기기의 데이터는 자동 연결되지 않습니다/);
});

test('shared-data pilot clears prior account data on logout and rejects stale session results',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/function clearSharedData\(/);
 assert.match(html,/session = null; clearSharedData\(\); updateAuth\(\)/);
 assert.match(html,/session\.user\?\.id !== requestedUser/);
 assert.match(html,/previousUser && previousUser !== session\.user\?\.id/);
 assert.match(html,/\$\(id\)\.replaceChildren\(\)/);
});
