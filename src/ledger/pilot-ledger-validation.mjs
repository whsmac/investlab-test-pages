export function validateLedger(candidate){
 if(!candidate||candidate.version!==1||!Array.isArray(candidate.accounts)||!Array.isArray(candidate.entries))throw Error('원장 형식이 올바르지 않습니다.');
 const ids=new Set();
 for(const a of candidate.accounts){if(!a||typeof a.id!=='string'||!a.id||typeof a.name!=='string'||!a.name||ids.has(a.id))throw Error('계좌 정보가 중복되거나 손상되었습니다.');ids.add(a.id);}
 const entries=[...candidate.entries].sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.created||0)-Number(b.created||0));
 const positions=new Map(),cash=new Map(),entryIds=new Set();
 const cashKey=(account,currency)=>account+'|'+currency;
 for(const e of entries){
  if(!e||typeof e.id!=='string'||!e.id||entryIds.has(e.id)||!ids.has(e.accountId)||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!['OPEN','BUY','SELL','DEPOSIT','WITHDRAW','DIVIDEND','FX'].includes(e.type))throw Error('거래내역에 잘못된 계좌·날짜·유형 또는 중복 ID가 있습니다.');
  entryIds.add(e.id);
  const currency=e.currency;
  if(!['USD','KRW'].includes(currency))throw Error(e.date+' 거래의 통화가 올바르지 않습니다.');
  const amount=Number(e.amount),qty=Number(e.qty),price=Number(e.price);
  const addCash=(cur,delta)=>{const key=cashKey(e.accountId,cur);const next=(cash.get(key)||0)+delta;if(next< -1e-7)throw Error(e.date+' '+e.accountId+' '+cur+' 현금잔고가 부족합니다.');cash.set(key,next);};
  if(['OPEN','BUY','SELL'].includes(e.type)){
   if(currency!=='USD'||typeof e.symbol!=='string'||!/^[A-Z][A-Z0-9.-]{0,15}$/.test(e.symbol)||!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0)throw Error(e.date+' 주식 거래 입력값이 올바르지 않습니다.');
   const key=e.accountId+'|'+e.symbol,next=(positions.get(key)||0)+(e.type==='SELL'?-qty:qty);
   if(next< -1e-7)throw Error(e.date+' '+e.symbol+' 매도수량이 보유수량을 초과합니다.');
   positions.set(key,next);
   if(e.type==='BUY')addCash('USD',-qty*price);
   if(e.type==='SELL')addCash('USD',qty*price);
  }else{
   if(!Number.isFinite(amount)||amount<=0)throw Error(e.date+' 현금 거래 금액이 올바르지 않습니다.');
   if(e.type==='DEPOSIT'||e.type==='DIVIDEND')addCash(currency,amount);
   if(e.type==='WITHDRAW')addCash(currency,-amount);
   if(e.type==='FX'){
    const received=Number(e.toAmount);
    if(!['USD','KRW'].includes(e.toCurrency)||e.toCurrency===currency||!Number.isFinite(received)||received<=0)throw Error(e.date+' 환전 통화·수령액이 올바르지 않습니다.');
    addCash(currency,-amount);addCash(e.toCurrency,received);
   }
  }
 }
 return true;
}
