import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewPortfolioValuation} from '../src/ledger/portfolio-valuation-preview.mjs';
import {weightedAverageAcquisitionCost} from '../src/ledger/weighted-average-cost.mjs';

const accounts=[
 {accountId:'a',name:'A',holdings:[{ticker:'TSLA',quantityDisplay:'3',averageCostUsd:'180'}]},
 {accountId:'b',name:'B',holdings:[{ticker:'TSLA',quantityDisplay:'2',averageCostUsd:'210'}]}
];
const holdings=[{ticker:'TSLA'}];
const expected=[
 {selected:null,market:1000,pnl:40,avg:192},
 {selected:'a',market:600,pnl:60,avg:180},
 {selected:'b',market:400,pnl:-20,avg:210},
 {selected:null,market:1000,pnl:40,avg:192}
];
test('all → A → B → all valuations and averages never leak previous account totals',()=>{
 for(const step of expected){
  const selected=step.selected?accounts.filter(a=>a.accountId===step.selected):accounts;
  const valuation=previewPortfolioValuation({holdings,accounts:selected,prices:{TSLA:'200'}});
  const cost=weightedAverageAcquisitionCost('TSLA',selected);
  assert.equal(valuation.totalMarketValueUsd,step.market);
  assert.equal(valuation.totalUnrealizedPnlUsd,step.pnl);
  assert.equal(cost.averageCostUsd,step.avg);
 }
});
test('account switch clears previous summary before asynchronous Yahoo preview',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 assert.match(html,/el\('account'\)\.addEventListener\('change',\(\)=>\{invalidateYahooComparison\(\);lastYahooPriceDisplay=new Map\(\);lastPortfolioValuation=null;resetValuationSummary\('계좌 변경/);
 assert.match(html,/el\('valuation-completion-status'\)\.dataset\.state='stale'/);
 assert.match(html,/show\(\);rebuildAssumedPriceRows\(\);el\('yahoo-valuation-preview'\)\.click\(\)/);
 assert.match(html,/if\(current!==initialLedger\|\|el\('account'\)\.value!==initialAccount\)/);
 assert.match(html,/revision!==yahooComparisonRevision/);
});

test('failed Yahoo fetch clears selected-account summary and reports error state',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 const start=html.indexOf("el('yahoo-valuation-preview').addEventListener('click',async()=>{");
 const end=html.indexOf("el('yahoo-price-fill').addEventListener",start);
 assert.ok(start>=0&&end>start);
 const handler=html.slice(start,end);
 assert.match(handler,/if\(revision===yahooComparisonRevision\)\{/);
 assert.match(handler,/lastYahooPriceDisplay=new Map\(\);lastPortfolioValuation=null/);
 assert.match(handler,/resetValuationSummary\('최신 종가 조회 실패/);
 assert.match(handler,/el\('valuation-completion-status'\)\.dataset\.state='error'/);
 assert.match(handler,/finally\{if\(revision===yahooComparisonRevision\)button\.disabled=false;\}/);
 assert.match(handler,/revision!==yahooComparisonRevision\|\|current!==initialLedger\|\|el\('account'\)\.value!==initialAccount/);
});

test('account switch unlocks pending Yahoo preview button before starting replacement request',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 const start=html.indexOf("el('account').addEventListener('change',()=>{");
 assert.ok(start>=0);
 const handler=html.slice(start,html.indexOf("});",start)+3);
 assert.match(handler,/invalidateYahooComparison\(\)/);
 assert.match(handler,/el\('yahoo-valuation-preview'\)\.disabled=false;show\(\);rebuildAssumedPriceRows\(\);el\('yahoo-valuation-preview'\)\.click\(\)/);
 const fetchStart=html.indexOf("el('yahoo-valuation-preview').addEventListener('click',async()=>{");
 const fetchEnd=html.indexOf("el('yahoo-price-fill').addEventListener",fetchStart);
 const fetchHandler=html.slice(fetchStart,fetchEnd);
 assert.match(fetchHandler,/const revision=\+\+yahooComparisonRevision/);
 assert.match(fetchHandler,/finally\{if\(revision===yahooComparisonRevision\)button\.disabled=false;\}/);
});

test('ledger reload and invalid JSON both discard previous account valuation',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 const start=html.indexOf("el('render').addEventListener('click',()=>{");
 const end=html.indexOf("el('ledger-load').addEventListener",start);
 assert.ok(start>=0&&end>start);
 const handler=html.slice(start,end);
 assert.match(handler,/invalidateYahooComparison\(\);lastYahooPriceDisplay=new Map\(\);lastPortfolioValuation=null;resetValuationSummary\('원장 변경/);
 assert.match(handler,/el\('valuation-completion-status'\)\.dataset\.state='stale'/);
 assert.match(handler,/catch\(e\)\{current=null;lastYahooPriceDisplay=new Map\(\);lastPortfolioValuation=null;resetValuationSummary\('원장 입력 오류/);
});

test('valid ledger reload restarts selected Yahoo preview once, invalid ledger does not',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 const start=html.indexOf("el('render').addEventListener('click',()=>{");
 const end=html.indexOf("el('ledger-load').addEventListener",start);
 const handler=html.slice(start,end);
 const valid=handler.slice(handler.indexOf('try{const parsed='),handler.indexOf('}catch(e){current=null;'));
 const invalid=handler.slice(handler.indexOf('}catch(e){current=null;'));
 assert.ok(valid.includes("rebuildAssumedPriceRows();el('yahoo-valuation-preview').disabled=false;el('yahoo-valuation-preview').click();"));
 assert.ok(!invalid.includes("el('yahoo-valuation-preview').click()"));
 assert.ok(html.includes("el('yahoo-valuation-price-mode').value='latest-close';\nel('render').click();"));
 assert.ok(!html.includes("el('render').click();\nel('yahoo-valuation-price-mode').value='latest-close';\nel('yahoo-valuation-preview').click();"));
});

test('price and cost edits invalidate pending Yahoo preview before it can overwrite valuation',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 const start=html.indexOf('function markValuationStale(){');
 const end=html.indexOf("el('holding-assumed-price').addEventListener",start);
 assert.ok(start>=0&&end>start);
 const stale=html.slice(start,end);
 assert.match(stale,/invalidateYahooComparison\(\)/);
 assert.match(stale,/el\('yahoo-valuation-preview'\)\.disabled=false/);
 assert.match(stale,/lastPortfolioValuation=null/);
 const yahooStart=html.indexOf("el('yahoo-valuation-preview').addEventListener('click',async()=>{");
 const yahooEnd=html.indexOf("el('yahoo-price-fill').addEventListener",yahooStart);
 const handler=html.slice(yahooStart,yahooEnd);
 assert.match(handler,/revision!==yahooComparisonRevision/);
 assert.match(handler,/if\(revision===yahooComparisonRevision\)/);
});

test('two-account portfolio totals reconcile with account views across multiple tickers',()=>{
 const accounts=[
  {accountId:'a',name:'A',holdings:[{ticker:'TSLA',quantityDisplay:3,averageCostUsd:180},{ticker:'MSFT',quantityDisplay:4,averageCostUsd:300}]},
  {accountId:'b',name:'B',holdings:[{ticker:'TSLA',quantityDisplay:2,averageCostUsd:210},{ticker:'GOOGL',quantityDisplay:5,averageCostUsd:100}]}
 ];
 const prices={TSLA:200,MSFT:350,GOOGL:120};
 const cases=[
  {ids:['a'],tickers:['TSLA','MSFT'],market:2000,pnl:260},
  {ids:['b'],tickers:['TSLA','GOOGL'],market:1000,pnl:80},
  {ids:['a','b'],tickers:['TSLA','MSFT','GOOGL'],market:3000,pnl:340}
 ];
 for(const c of cases){
  const selected=accounts.filter(a=>c.ids.includes(a.accountId));
  const valuation=previewPortfolioValuation({holdings:c.tickers.map(ticker=>({ticker})),accounts:selected,prices});
  assert.equal(valuation.totalMarketValueUsd,c.market);
  assert.equal(valuation.totalUnrealizedPnlUsd,c.pnl);
  assert.equal(valuation.rows.reduce((sum,row)=>sum+row.marketValueUsd,0),c.market);
  assert.equal(valuation.rows.reduce((sum,row)=>sum+row.unrealizedPnlUsd,0),c.pnl);
 }
 const all=previewPortfolioValuation({holdings:cases[2].tickers.map(ticker=>({ticker})),accounts,prices});
 const a=previewPortfolioValuation({holdings:cases[0].tickers.map(ticker=>({ticker})),accounts:[accounts[0]],prices});
 const b=previewPortfolioValuation({holdings:cases[1].tickers.map(ticker=>({ticker})),accounts:[accounts[1]],prices});
 assert.equal(all.totalMarketValueUsd,a.totalMarketValueUsd+b.totalMarketValueUsd);
 assert.equal(all.totalUnrealizedPnlUsd,a.totalUnrealizedPnlUsd+b.totalUnrealizedPnlUsd);
 assert.equal(weightedAverageAcquisitionCost('TSLA',accounts).averageCostUsd,192);
});

test('per-ticker cost, market value, and P&L update consistently across account switches',()=>{
 const accounts=[
  {accountId:'a',name:'A',holdings:[{ticker:'TSLA',quantityDisplay:'3',averageCostUsd:'180'},{ticker:'MSFT',quantityDisplay:'2',averageCostUsd:'300'}]},
  {accountId:'b',name:'B',holdings:[{ticker:'TSLA',quantityDisplay:'2',averageCostUsd:'210'},{ticker:'MSFT',quantityDisplay:'1',averageCostUsd:'360'}]}
 ];
 const prices={TSLA:'200',MSFT:'350'};
 const steps=[
  {id:null,tsla:[5,192,1000,40],msft:[3,320,1050,90],market:2050,pnl:130},
  {id:'a',tsla:[3,180,600,60],msft:[2,300,700,100],market:1300,pnl:160},
  {id:'b',tsla:[2,210,400,-20],msft:[1,360,350,-10],market:750,pnl:-30},
  {id:null,tsla:[5,192,1000,40],msft:[3,320,1050,90],market:2050,pnl:130}
 ];
 for(const step of steps){
  const selected=step.id?accounts.filter(a=>a.accountId===step.id):accounts;
  const valuation=previewPortfolioValuation({holdings:[{ticker:'TSLA'},{ticker:'MSFT'}],accounts:selected,prices});
  for(const [ticker,expected] of [['TSLA',step.tsla],['MSFT',step.msft]]){
   const cost=weightedAverageAcquisitionCost(ticker,selected);
   const row=valuation.rows.find(row=>row.ticker===ticker);
   assert.deepEqual([cost.quantity,cost.averageCostUsd,row.marketValueUsd,row.unrealizedPnlUsd],expected);
  }
  assert.equal(valuation.totalMarketValueUsd,step.market);
  assert.equal(valuation.totalUnrealizedPnlUsd,step.pnl);
 }
});
