// Pure, read-only preview of selected hypothetical import rows. No live quotes or writes.
export function previewBulkImportValuation(rows){
 if(!Array.isArray(rows))throw Error('rows must be an array');
 const items=rows.map(row=>{
  const ticker=String(row.ticker||'').trim().toUpperCase();
  const quantity=Number(row.quantity),costRaw=row.averageCostUsd,priceRaw=row.assumedPriceUsd;
  if(!ticker||!Number.isFinite(quantity)||quantity<=0)throw Error('invalid ticker or quantity');
  const hasCost=costRaw!==''&&costRaw!==null&&costRaw!==undefined&&Number.isFinite(Number(costRaw))&&Number(costRaw)>=0;
  const hasPrice=priceRaw!==''&&priceRaw!==null&&priceRaw!==undefined&&Number.isFinite(Number(priceRaw))&&Number(priceRaw)>=0;
  const costBasisUsd=hasCost?quantity*Number(costRaw):null;
  const marketValueUsd=hasPrice?quantity*Number(priceRaw):null;
  const unrealizedPnlUsd=costBasisUsd!==null&&marketValueUsd!==null?marketValueUsd-costBasisUsd:null;
  const returnRatePct=unrealizedPnlUsd!==null&&costBasisUsd>0?unrealizedPnlUsd/costBasisUsd*100:null;
  return {ticker,quantity,costBasisUsd,marketValueUsd,unrealizedPnlUsd,returnRatePct,status:!hasCost?'COST_MISSING':!hasPrice?'PRICE_MISSING':'COMPLETE'};
 });
 const complete=items.filter(item=>item.status==='COMPLETE');
 const fullyCalculated=items.length>0&&complete.length===items.length;
 return {rows:items,completeCount:complete.length,totalCount:items.length,fullyCalculated,totalMarketValueUsd:fullyCalculated?items.reduce((sum,item)=>sum+item.marketValueUsd,0):null,totalUnrealizedPnlUsd:fullyCalculated?items.reduce((sum,item)=>sum+item.unrealizedPnlUsd,0):null,canPersist:false,priceSource:'USER_ASSUMPTION_NOT_LIVE'};
}
