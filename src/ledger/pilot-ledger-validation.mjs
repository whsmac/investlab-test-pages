import {tradeSettlement,CREDIT_TYPES,DEBIT_TYPES,isBrokerageEntry} from './pilot-brokerage-settlement.mjs';
export function validateLedger(candidate){
 if(!candidate||candidate.version!==1||!Array.isArray(candidate.accounts)||!Array.isArray(candidate.entries))throw Error('원장 형식이 올바르지 않습니다.');
 const ids=new Set();
 for(const a of candidate.accounts){if(!a||typeof a.id!=='string'||!a.id||typeof a.name!=='string'||!a.name||ids.has(a.id))throw Error('계좌 정보가 중복되거나 손상되었습니다.');ids.add(a.id);}
 const entries=[...candidate.entries].sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.created||0)-Number(b.created||0));
 const positions=new Map(),cash=new Map(),entryIds=new Set();
 const cashKey=(account,currency)=>account+'|'+currency;
 for(const e of entries){
  if(!e||typeof e.id!=='string'||!e.id||entryIds.has(e.id)||!ids.has(e.accountId)||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!['OPEN','BUY','SELL','FX',...CREDIT_TYPES,...DEBIT_TYPES].includes(e.type))throw Error('거래내역에 잘못된 계좌·날짜·유형 또는 중복 ID가 있습니다.');
  entryIds.add(e.id);
  const currency=e.currency;
  if(!['USD','KRW'].includes(currency))throw Error(e.date+' 거래의 통화가 올바르지 않습니다.');
  const imported=isBrokerageEntry(e),proof=e.brokerage;
  if(e.brokerage!==undefined&&(!imported||!Number.isInteger(proof.page)||proof.page<1||!Number.isInteger(proof.seq)||proof.seq<1||!proof.postCash||typeof proof.postCash!=='object'||Array.isArray(proof.postCash)))throw Error('증권사 원본 검산정보 오류');
  if(e.settlementAmount!==undefined&&(!imported||!['BUY','SELL'].includes(e.type)||typeof e.settlementAmount!=='number'||!Number.isFinite(e.settlementAmount)||e.settlementAmount<=0))throw Error('실제 정산금액 오류');
  if(e.feeUsd!==undefined&&(imported||e.executionPrice!==undefined||e.commissionUsd!==undefined||!['BUY','SELL'].includes(e.type)||typeof e.feeUsd!=='number'||!Number.isFinite(e.feeUsd)||e.feeUsd<0||!Number.isFinite(tradeSettlement(e))||tradeSettlement(e)<0))throw Error('수수료 또는 정산금액 오류');
  if(!imported&&!['OPEN','BUY','SELL','DEPOSIT','WITHDRAW','DIVIDEND','FX'].includes(e.type))throw Error('증권사 원본 거래만 지원');
  const touched=new Set();
  const amount=Number(e.amount),qty=Number(e.qty),price=Number(e.price);
  const addCash=(cur,delta)=>{const key=cashKey(e.accountId,cur);const next=(cash.get(key)||0)+delta;if(next< -1e-7&&!imported)throw Error(e.date+' '+e.accountId+' '+cur+' 현금잔고가 부족합니다.');cash.set(key,next);touched.add(cur);};
  if(['OPEN','BUY','SELL'].includes(e.type)){
   if(currency!=='USD'||typeof e.symbol!=='string'||!/^[A-Z][A-Z0-9.-]{0,15}$/.test(e.symbol)||!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0)throw Error(e.date+' 주식 거래 입력값이 올바르지 않습니다.');
   const key=e.accountId+'|'+e.symbol,next=(positions.get(key)||0)+(e.type==='SELL'?-qty:qty);
   if(next< -1e-7)throw Error(e.date+' '+e.symbol+' 매도수량이 보유수량을 초과합니다.');
   positions.set(key,next);
   if(e.type==='BUY')addCash('USD',-tradeSettlement(e));
   if(e.type==='SELL')addCash('USD',tradeSettlement(e));
   if(imported&&(!['BUY','SELL'].includes(e.type)||!Number.isFinite(proof.postQty)||Math.abs(next-proof.postQty)>1e-7||e.settlementAmount===undefined))throw Error('원본 거래 후 수량 불일치');
  }else{
   if(!Number.isFinite(amount)||amount<=0)throw Error(e.date+' 현금 거래 금액이 올바르지 않습니다.');
   if(CREDIT_TYPES.includes(e.type))addCash(currency,amount);
   if(DEBIT_TYPES.includes(e.type))addCash(currency,-amount);
   if(e.type==='FX'){
    const received=Number(e.toAmount);
    if(!['USD','KRW'].includes(e.toCurrency)||e.toCurrency===currency||!Number.isFinite(received)||received<=0)throw Error(e.date+' 환전 통화·수령액이 올바르지 않습니다.');
    addCash(currency,-amount);addCash(e.toCurrency,received);
   }
  }
  if(imported){if(Object.keys(proof.postCash).length!==touched.size||[...touched].some(cur=>typeof proof.postCash[cur]!=='number'||!Number.isFinite(proof.postCash[cur])||Math.abs((cash.get(cashKey(e.accountId,cur))||0)-proof.postCash[cur])>1e-6))throw Error(e.date+' 원본 거래 후 현금잔고 불일치');}
 }
 if([...cash.values()].some(n=>n< -1e-7))throw Error('최종 현금잔고가 부족합니다.');
 return true;
}
