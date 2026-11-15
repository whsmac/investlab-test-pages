// Read-only comparison on imported quantities/costs; no live quotes or persistence.
import {compareBulkAssumedPrices} from './bulk-price-difference.mjs';
export function previewBulkPriceImpact({rows,assumedPrices,existingPrices}){
 if(!Array.isArray(rows))throw Error('rows must be array');
 const differences=compareBulkAssumedPrices({tickers:rows.map(row=>row.ticker),assumedPrices,existingPrices});
 const results=differences.map((item,index)=>{
  const row=rows[index],quantity=Number(row.quantity),rawCost=row.averageCostUsd;
  if(!Number.isFinite(quantity)||quantity<=0)throw Error('invalid quantity');
  const hasCost=rawCost!==''&&rawCost!==null&&rawCost!==undefined&&Number.isFinite(Number(rawCost))&&Number(rawCost)>=0;
  const complete=hasCost&&item.previous!==null&&item.incoming!==null;
  const oldMarketValueUsd=item.previous===null?null:quantity*item.previous;
  const newMarketValueUsd=item.incoming===null?null:quantity*item.incoming;
  const costBasisUsd=hasCost?quantity*Number(rawCost):null;
  return {...item,quantity,oldMarketValueUsd,newMarketValueUsd,oldPnlUsd:complete?oldMarketValueUsd-costBasisUsd:null,newPnlUsd:complete?newMarketValueUsd-costBasisUsd:null,marketValueChangeUsd:complete?newMarketValueUsd-oldMarketValueUsd:null,pnlChangeUsd:complete?newMarketValueUsd-oldMarketValueUsd:null,comparable:complete};
 });
 const comparable=results.filter(item=>item.comparable);
 const fullyComparable=results.length>0&&comparable.length===results.length;
 const sum=(key)=>comparable.reduce((total,item)=>total+item[key],0);
 return {rows:results,comparableCount:comparable.length,totalCount:results.length,fullyComparable,comparableMarketValueChangeUsd:comparable.length?sum('marketValueChangeUsd'):null,comparablePnlChangeUsd:comparable.length?sum('pnlChangeUsd'):null,totalOldMarketValueUsd:fullyComparable?sum('oldMarketValueUsd'):null,totalNewMarketValueUsd:fullyComparable?sum('newMarketValueUsd'):null,totalOldPnlUsd:fullyComparable?sum('oldPnlUsd'):null,totalNewPnlUsd:fullyComparable?sum('newPnlUsd'):null,canPersist:false,priceSource:'USER_ASSUMPTION_NOT_LIVE'};
}
