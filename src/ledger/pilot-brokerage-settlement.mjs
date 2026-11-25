// Shared actual settlement semantics; legacy manual entries retain gross calculation.
export const CREDIT_TYPES=['DEPOSIT','DIVIDEND','LINK_IN','TAX_REFUND','FEE_CREDIT','FX_ADJUST'];
export const DEBIT_TYPES=['WITHDRAW','LINK_OUT','TAX'];
export const EXTERNAL_IN=['DEPOSIT','LINK_IN','OPEN'];
export const EXTERNAL_OUT=['WITHDRAW','LINK_OUT'];
export function tradeSettlement(e){
 return e.settlementAmount===undefined?Number(e.qty)*Number(e.price):Number(e.settlementAmount);
}
export function isBrokerageEntry(e){return e.brokerage?.format==='STATEMENT_V1';}
