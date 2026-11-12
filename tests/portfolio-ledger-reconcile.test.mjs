import test from 'node:test';import assert from 'node:assert/strict';import {reconcilePortfolioLedger} from '../src/ledger/portfolio-ledger-reconcile.mjs';
const a='11111111-1111-4111-8111-111111111111';
const opening={id:'o',accountId:a,requestId:'o1',type:'opening',legs:[{assetType:'cash',assetCode:'USD',delta:'500'},{assetType:'security',assetCode:'USD',delta:'2'},{assetType:'security',assetCode:'TSLA',delta:'3'}]};
const positions=[{accountId:a,ticker:'USD',quantity:'2',averageCostUsd:'45'},{accountId:a,ticker:'TSLA',quantity:'3',averageCostUsd:'100'}],cash=[{accountId:a,currency:'USD',balance:'500'}];
test('matching multi-asset portfolio and ledger reconcile',()=>{const r=reconcilePortfolioLedger({positions,cash,events:[opening]});assert.equal(r.status,'OFFLINE_QUANTITIES_MATCH_NOT_SERVER_VERIFIED');assert.equal(r.comparedAssets,3)});
test('cash mismatch is detected exactly',()=>{const r=reconcilePortfolioLedger({positions,cash:[{...cash[0],balance:'499.99999999'}],events:[opening]});assert.equal(r.status,'MISMATCH_REVIEW_REQUIRED');assert.equal(r.differences[0].delta,'0.00000001')});
test('missing security is detected',()=>{const r=reconcilePortfolioLedger({positions:positions.slice(0,1),cash,events:[opening]});assert.ok(r.differences.some(x=>x.accountAsset.endsWith('security:TSLA')))});
test('USD ETF and USD cash remain distinct',()=>{const r=reconcilePortfolioLedger({positions,cash,events:[opening]});assert.equal(r.comparedAssets,3)});
test('invalid snapshot rows are rejected',()=>assert.throws(()=>reconcilePortfolioLedger({positions:[...positions,positions[0]],cash,events:[opening]}),/duplicate/));
