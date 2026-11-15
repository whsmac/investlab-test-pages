// Offline, hypothetical USD valuation only. No live prices, FX, tax or server writes.
const NUM=/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;
export function previewHoldingValuation({ticker,accounts=[],assumedPriceUsd}={}){
 if(typeof ticker!=='string'||!ticker.trim()||!Array.isArray(accounts))throw Error('invalid holding');
 if(typeof assumedPriceUsd!=='string'||!NUM.test(assumedPriceUsd))throw Error('valid hypothetical USD price required');
 const price=Number(assumedPriceUsd);if(!Number.isFinite(price))throw Error('invalid price');
 const rows=accounts.map(a=>{
  if(!a||typeof a.accountId!=='string'||typeof a.quantityDisplay!=='string'||!NUM.test(a.quantityDisplay))throw Error('invalid account quantity');
  const quantity=Number(a.quantityDisplay),cost=a.averageCostUsd;
  if(cost!==null&&(typeof cost!=='string'||!NUM.test(cost)))throw Error('invalid account cost');
  const value=quantity*price,basis=cost===null?null:quantity*Number(cost);
  return {accountId:a.accountId,accountName:a.accountName,quantityDisplay:a.quantityDisplay,averageCostUsd:cost,assumedPriceUsd,marketValueUsd:value,costBasisUsd:basis,unrealizedPnlUsd:basis===null?null:value-basis};
 });
 const complete=rows.length>0&&rows.every(r=>r.unrealizedPnlUsd!==null);
 return {ticker,priceSource:'USER_ASSUMPTION_NOT_LIVE',rows,totalMarketValueUsd:rows.reduce((sum,r)=>sum+r.marketValueUsd,0),totalUnrealizedPnlUsd:complete?rows.reduce((sum,r)=>sum+r.unrealizedPnlUsd,0):null,costComplete:complete,canPersist:false,serverVerified:false};
}
