import test from 'node:test';import assert from 'node:assert/strict';
import {validateTradeDraft,previewLedgerBalances} from '../src/ledger/offline-ledger-check.mjs';
const base={requestId:'usd-equity-test',accountId:'123e4567-e89b-12d3-a456-426614174000',side:'buy',ticker:'USD',quantity:'1',unitPriceUsd:'83.6'};
test('USD ticker is an equity/security while USD cash remains distinct',()=>{
 const v=validateTradeDraft(base);assert.equal(v.ticker,'USD');assert.equal(v.currency,'USD');
 const projection=previewLedgerBalances([{eventId:'usd-etf-1',legs:[{assetType:'security',assetCode:'USD',delta:'1'},{assetType:'cash',assetCode:'USD',delta:'-83.6'}]}]);
 assert.ok(projection);
});
test('USD-CASH cannot be traded as security ticker',()=>assert.throws(()=>validateTradeDraft({...base,ticker:'USD-CASH'})));
