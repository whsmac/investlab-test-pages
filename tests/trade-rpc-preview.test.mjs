import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTradeRpcPreview} from '../src/ledger/trade-rpc-preview.mjs';
const base={requestId:'abc-123',accountId:'123e4567-e89b-12d3-a456-426614174000',side:'sell',ticker:'TSLA',quantity:'10',unitPriceUsd:'500',occurredAt:'2026-11-12T09:30:00+09:00'};
test('RPC preview maps names and timezone without sending',()=>{
 const x=buildTradeRpcPreview(base);
 assert.equal(x.rpc,'investlab_post_trade_v0');
 assert.equal(x.args.p_quantity,'10.00000000');
 assert.equal(x.args.p_unit_price_usd,'500.00000000');
 assert.equal(x.args.p_occurred_at,'2026-11-12T00:30:00.000Z');
 assert.equal(x.preview.cashDelta,'+5000.00000000');
 assert.equal(x.status,'PREVIEW_ONLY_NOT_SENT');
});
test('invalid timestamps rejected',()=>{
 for(const occurredAt of ['2026-11-12T09:30:00','not-a-date','2026-99-99T00:00:00Z',null]){
  assert.throws(()=>buildTradeRpcPreview({...base,occurredAt}));
 }
});
test('invalid trades never reach adapter output',()=>{
 assert.throws(()=>buildTradeRpcPreview({...base,quantity:'0'}));
});
