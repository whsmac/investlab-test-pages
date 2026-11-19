// Advisory only: suggestions do not alter a trade or execute subsequent steps.
export function suggestFailedTradeAdjustment(diagnostic,trades){
 if(!diagnostic||!Array.isArray(trades))return null;
 const trade=trades[diagnostic.tradeNumber-1];
 if(!trade||!Number.isFinite(trade.price)||trade.price<=0||!Number.isFinite(trade.fee??0))return null;
 if(diagnostic.kind==='CASH'){
  const affordable=Math.max(0,(diagnostic.available-(trade.fee??0))/trade.price);
  return {kind:'CASH',additionalCashUsd:diagnostic.shortfall,maxAffordableQuantity:Math.floor((affordable+1e-10)*1e8)/1e8,originalQuantity:trade.quantity,note:'거래 수수료를 포함한 단일 실패 거래 기준입니다. 이후 단계 실행 가능 여부는 다시 계산해야 합니다.'};
 }
 if(diagnostic.kind==='SHARES')return {kind:'SHARES',reduceQuantityBy:diagnostic.shortfall,maxSellQuantity:diagnostic.available,originalQuantity:trade.quantity,note:'실패 거래의 매도 가능 수량 기준입니다. 이후 단계 실행 가능 여부는 다시 계산해야 합니다.'};
 return null;
}
