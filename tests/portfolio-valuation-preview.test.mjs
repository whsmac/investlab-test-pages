import test from 'node:test';import assert from 'node:assert/strict';import {previewPortfolioValuation} from '../src/ledger/portfolio-valuation-preview.mjs';
const accounts=[{accountId:'a',name:'A',holdings:[{ticker:'TSLA',quantityDisplay:'2',averageCostUsd:'100'},{ticker:'SOXL',quantityDisplay:'1',averageCostUsd:'20'}]}],holdings=[{ticker:'TSLA'},{ticker:'SOXL'}];
test('full hypothetical portfolio aggregates values and P&L',()=>{const r=previewPortfolioValuation({holdings,accounts,prices:{TSLA:'150',SOXL:'30'}});assert.equal(r.totalMarketValueUsd,330);assert.equal(r.totalUnrealizedPnlUsd,110);assert.equal(r.status,'COMPLETE_HYPOTHETICAL');});
test('missing assumed price blocks totals',()=>{const r=previewPortfolioValuation({holdings,accounts,prices:{TSLA:'150'}});assert.equal(r.totalMarketValueUsd,null);assert.equal(r.totalUnrealizedPnlUsd,null);});
test('missing cost blocks total P&L',()=>{const r=previewPortfolioValuation({holdings,accounts:[{...accounts[0],holdings:[accounts[0].holdings[0],{...accounts[0].holdings[1],averageCostUsd:null}]}],prices:{TSLA:'150',SOXL:'30'}});assert.equal(r.totalMarketValueUsd,330);assert.equal(r.totalUnrealizedPnlUsd,null);});

test('partial portfolio preserves per-symbol values but never displays a misleading total',()=>{
 const mixed=[{accountId:'a',name:'A',holdings:[
  {ticker:'TSLA',quantityDisplay:'2',averageCostUsd:'100'},
  {ticker:'SOXL',quantityDisplay:'1',averageCostUsd:null},
  {ticker:'TQQQ',quantityDisplay:'3',averageCostUsd:'40'}
 ]}];
 const r=previewPortfolioValuation({holdings:[{ticker:'TSLA'},{ticker:'SOXL'},{ticker:'TQQQ'}],accounts:mixed,prices:{TSLA:'150',SOXL:'30'}});
 assert.deepEqual(r.rows.map(x=>x.status),['COMPLETE_HYPOTHETICAL','COST_MISSING','PRICE_MISSING']);
 assert.deepEqual(r.rows.map(x=>x.marketValueUsd),[300,30,null]);
 assert.deepEqual(r.rows.map(x=>x.unrealizedPnlUsd),[100,null,null]);
 assert.equal(r.totalMarketValueUsd,null);
 assert.equal(r.totalUnrealizedPnlUsd,null);
 assert.equal(r.totalUnrealizedPnlRatePct,null);
 assert.equal(r.status,'PARTIAL_NOT_TOTALABLE');
});
