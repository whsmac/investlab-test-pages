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
