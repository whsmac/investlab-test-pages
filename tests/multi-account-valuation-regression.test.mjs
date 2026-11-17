import test from 'node:test';
import assert from 'node:assert/strict';
import {previewHoldingValuation} from '../src/ledger/holding-valuation-preview.mjs';
import {previewPortfolioValuation} from '../src/ledger/portfolio-valuation-preview.mjs';

// TEST-only, read-only regression coverage for two accounts holding the same symbol.
const accounts=[
 {accountId:'a',name:'A',holdings:[{ticker:'TSLA',quantityDisplay:'3',averageCostUsd:'180'}]},
 {accountId:'b',name:'B',holdings:[{ticker:'TSLA',quantityDisplay:'2',averageCostUsd:'210'}]}
];
const holdings=[{ticker:'TSLA'}];
test('two-account cost basis implies quantity-weighted USD average of 192, not simple mean',()=>{
 const rows=accounts.map(a=>({accountId:a.accountId,accountName:a.name,...a.holdings[0]}));
 const original=structuredClone(rows);
 const result=previewHoldingValuation({ticker:'TSLA',accounts:rows,assumedPriceUsd:'200'});
 const quantity=rows.reduce((sum,row)=>sum+Number(row.quantityDisplay),0);
 const basis=result.rows.reduce((sum,row)=>sum+row.costBasisUsd,0);
 assert.equal(quantity,5);
 assert.equal(basis,960);
 assert.equal(basis/quantity,192);
 assert.notEqual(basis/quantity,(180+210)/2);
 assert.equal(result.totalMarketValueUsd,1000);
 assert.equal(result.totalUnrealizedPnlUsd,40);
 assert.deepEqual(rows,original);
 assert.equal(result.canPersist,false);
});
test('portfolio combines the same ticker across accounts without double counting',()=>{
 const result=previewPortfolioValuation({holdings,accounts,prices:{TSLA:'200'}});
 assert.equal(result.rows.length,1);
 assert.equal(result.totalMarketValueUsd,1000);
 assert.equal(result.totalUnrealizedPnlUsd,40);
 assert.equal(result.totalUnrealizedPnlRatePct,40/960*100);
 assert.equal(result.canPersist,false);
});
test('missing cost in either account preserves market value but suppresses consolidated profit',()=>{
 for(const missingIndex of [0,1]){
  const partial=structuredClone(accounts);
  partial[missingIndex].holdings[0].averageCostUsd=null;
  const result=previewPortfolioValuation({holdings,accounts:partial,prices:{TSLA:'200'}});
  assert.equal(result.totalMarketValueUsd,1000);
  assert.equal(result.totalUnrealizedPnlUsd,null);
  assert.equal(result.totalUnrealizedPnlRatePct,null);
  assert.equal(result.status,'PARTIAL_NOT_TOTALABLE');
 }
});
test('missing current price suppresses both market value and profit',()=>{
 const result=previewPortfolioValuation({holdings,accounts,prices:{}});
 assert.equal(result.totalMarketValueUsd,null);
 assert.equal(result.totalUnrealizedPnlUsd,null);
 assert.equal(result.rows[0].status,'PRICE_MISSING');
});

import {weightedAverageAcquisitionCost} from '../src/ledger/weighted-average-cost.mjs';
import {readFileSync} from 'node:fs';
test('display weighted average matches valuation cost basis across all and selected accounts',()=>{
 const all=weightedAverageAcquisitionCost('TSLA',accounts);
 const selected=weightedAverageAcquisitionCost('TSLA',[accounts[1]]);
 const valuation=previewPortfolioValuation({holdings,accounts,prices:{TSLA:'200'}});
 assert.equal(all.quantity,5);
 assert.equal(all.averageCostUsd,192);
 assert.equal(all.costBasisUsd,960);
 assert.equal(selected.quantity,2);
 assert.equal(selected.averageCostUsd,210);
 assert.equal(selected.costBasisUsd,420);
 assert.equal(all.costBasisUsd,valuation.totalMarketValueUsd-valuation.totalUnrealizedPnlUsd);
});
test('display suppresses consolidated cost if either nonzero account lacks acquisition price',()=>{
 for(const index of [0,1]){
  const partial=structuredClone(accounts);
  partial[index].holdings[0].averageCostUsd=null;
  const display=weightedAverageAcquisitionCost('TSLA',partial);
  const valuation=previewPortfolioValuation({holdings,accounts:partial,prices:{TSLA:'200'}});
  assert.equal(display.complete,false);
  assert.equal(display.averageCostUsd,null);
  assert.equal(display.costBasisUsd,null);
  assert.equal(valuation.totalUnrealizedPnlUsd,null);
 }
});
test('portfolio UI uses weighted average helper for its visible cost cell and account filter',()=>{
 const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
 assert.match(html,/import \{weightedAverageAcquisitionCost\} from '\.\/src\/ledger\/weighted-average-cost\.mjs'/);
 assert.match(html,/const cost=weightedAverageAcquisitionCost\(ticker,selectedValuationAccounts\(v\)\.filter\(a=>!v\.selectedAccountId\|\|a\.accountId===v\.selectedAccountId\)\)/);
 assert.match(html,/costCell\.textContent=cost\.complete\?'USD '\+cost\.averageCostUsd\.toLocaleString/);
 assert.match(html,/cost\.complete\?'수량 가중평균 매입단가':'매입단가 미입력'/);
});
