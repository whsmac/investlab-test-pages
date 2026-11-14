// Browser/Node-compatible pure adapter. No network, storage, or DB writes.
import {validateTradeDraft} from './offline-ledger-check.mjs';
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const DEC=/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;
const normalize=(v,label)=>{
 if(typeof v!=='string'||!DEC.test(v))throw Error(label+' must be a decimal string');
 const [whole,fraction='']=v.split('.');
 return whole+'.'+fraction.padEnd(8,'0');
};
export function buildTradeRpcPreview(input){
 const v=validateTradeDraft(input);
 const occurredAt=input.occurredAt;
 if(typeof occurredAt!=='string'||!ISO.test(occurredAt)||Number.isNaN(Date.parse(occurredAt)))throw Error('occurredAt must be an ISO 8601 timestamp with timezone');
 const timestamp=new Date(occurredAt).toISOString();
 return Object.freeze({
  rpc:'investlab_post_trade_v0',
  args:Object.freeze({
   p_account_id:v.accountId,
   p_request_id:v.requestId,
   p_side:v.side,
   p_ticker:v.ticker,
   p_quantity:normalize(input.quantity,'quantity'),
   p_unit_price_usd:normalize(input.unitPriceUsd,'unitPriceUsd'),
   p_occurred_at:timestamp
  }),
  preview:Object.freeze({securityDelta:v.securityDelta,cashDelta:v.cashDelta,currency:v.currency}),
  status:'PREVIEW_ONLY_NOT_SENT'
 });
}
