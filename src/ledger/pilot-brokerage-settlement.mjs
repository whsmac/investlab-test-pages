// Shared actual settlement semantics; legacy manual entries retain gross calculation.
export const CREDIT_TYPES=['DEPOSIT','DIVIDEND','LINK_IN','TAX_REFUND','FEE_CREDIT','FX_ADJUST'];
export const DEBIT_TYPES=['WITHDRAW','LINK_OUT','TAX'];
export const EXTERNAL_IN=['DEPOSIT','LINK_IN','OPEN'];
export const EXTERNAL_OUT=['WITHDRAW','LINK_OUT'];
// feeUsd applies only to new manual trades; earlier effective-price entries
// have executionPrice and commissionUsd metadata but already include the fee in price.
export function tradeExecutionPrice(e){return Number(e.executionPrice??e.price);}
export function tradeFeeUsd(e){return e.feeUsd??e.commissionUsd??null;}
export function tradeSettlement(e){
 if(e.settlementAmount!==undefined)return Number(e.settlementAmount);
 const gross=Number(e.qty)*Number(e.price);
 if(e.feeUsd===undefined)return gross;
 return gross+(e.type==='SELL'?-1:1)*Number(e.feeUsd);
}
export function isBrokerageEntry(e){return e.brokerage?.format==='STATEMENT_V1';}
