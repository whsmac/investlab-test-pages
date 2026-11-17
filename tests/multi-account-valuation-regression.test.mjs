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
