import test from 'node:test';
import assert from 'node:assert/strict';
import {previewTradeRpc,previewCashRpc} from '../src/ledger/ledger-trade-cash-rpc-preview.mjs';
const accountId='33333333-3333-4333-8333-333333333333';
const trade={accountId,requestId:'buy-1',side:'buy',ticker:'TSLA',quantity:'2',grossUsd:'500.5'};
test('buy and sell previews produce opposing USD/security legs',()=>{
 const buy=previewTradeRpc(trade);
 assert.deepEqual(buy.legs,[{assetType:'security',assetCode:'TSLA',delta:'2.00000000'},{assetType:'cash',assetCode:'USD',delta:'-500.50000000'}]);
 const sell=previewTradeRpc({...trade,side:'sell',requestId:'sell-1'});
 assert.deepEqual(sell.legs,[{assetType:'security',assetCode:'TSLA',delta:'-2.00000000'},{assetType:'cash',assetCode:'USD',delta:'500.50000000'}]);
 assert.equal(buy.canExecute,false);
});
test('cash previews enforce direction and currency',()=>{
 for(const type of ['deposit','withdrawal','fee']){
  const p=previewCashRpc({accountId,requestId:type,type,currency:'KRW',amount:'1000'});
  assert.equal(p.legs[0].delta,(type==='deposit'?'':'-')+'1000.00000000');
  assert.equal(p.canExecute,false);
 }
});
test('reject invalid inputs, user identity and numeric overflow',()=>{
 for(const input of [{...trade,userId:accountId},{...trade,quantity:'0'},{...trade,quantity:'1e4'},{...trade,quantity:'1000000000000000000'},{...trade,ticker:'USD'},{...trade,side:'exchange'}])assert.throws(()=>previewTradeRpc(input));
 assert.throws(()=>previewCashRpc({accountId,requestId:'cash-1',type:'deposit',currency:'EUR',amount:'10'}));
});
