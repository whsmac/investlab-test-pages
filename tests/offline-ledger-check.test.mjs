import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTradeDraft,previewLedgerBalances} from '../src/ledger/offline-ledger-check.mjs';
const accountId='123e4567-e89b-12d3-a456-426614174000';
const base={requestId:'req-1',accountId,side:'sell',ticker:'TSLA',quantity:'10',unitPriceUsd:'500'};
test('sell preview has two opposite legs',()=>{
 const v=validateTradeDraft(base);
 assert.equal(v.securityDelta,'-10.00000000');
 assert.equal(v.cashDelta,'+5000.00000000');
});
test('buy preview',()=>{
 const v=validateTradeDraft({...base,side:'buy',quantity:'0.5',unitPriceUsd:'100'});
 assert.equal(v.securityDelta,'+0.50000000');
 assert.equal(v.cashDelta,'-50.00000000');
});
test('reject invalid/ambiguous inputs',()=>{
 for(const bad of [{ticker:'USD'},{quantity:'-1'},{unitPriceUsd:'NaN'},{quantity:1},{quantity:'0'},{requestId:''},{quantity:'0.00000001',unitPriceUsd:'0.00000001'}]){
  assert.throws(()=>validateTradeDraft({...base,...bad}));
 }
});
test('ledger balance projection and duplicate protection',()=>{
 const e={eventId:'1',legs:[{assetType:'security',assetCode:'TSLA',delta:'-10'},{assetType:'cash',assetCode:'USD',delta:'5000'}]};
 assert.deepEqual(previewLedgerBalances([e]),{'cash:USD':'5000.00000000','security:TSLA':'-10.00000000'});
 assert.throws(()=>previewLedgerBalances([e,e]),/duplicate/);
});
test('invalid legs rejected',()=>{
 assert.throws(()=>previewLedgerBalances([{eventId:'1',legs:[{assetType:'cash',assetCode:'TSLA',delta:'1'}]}]));
});
