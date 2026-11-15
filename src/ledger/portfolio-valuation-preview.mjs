import {previewHoldingValuation} from './holding-valuation-preview.mjs';
export function previewPortfolioValuation({holdings=[],prices={},accounts=[]}={}){
 if(!Array.isArray(holdings)||!Array.isArray(accounts)||!prices||typeof prices!=='object'||Array.isArray(prices))throw Error('invalid portfolio input');
 const seen=new Set();
 const rows=holdings.map(h=>{
  if(!h||typeof h.ticker!=='string'||seen.has(h.ticker))throw Error('invalid or duplicate ticker');
  seen.add(h.ticker);
  const assumedPriceUsd=prices[h.ticker];
  if(assumedPriceUsd===undefined||assumedPriceUsd==='')return {ticker:h.ticker,status:'PRICE_MISSING',marketValueUsd:null,unrealizedPnlUsd:null};
  const relevant=accounts.flatMap(a=>(a.holdings||[]).filter(x=>x.ticker===h.ticker).map(x=>({accountId:a.accountId,accountName:a.name,quantityDisplay:x.quantityDisplay,averageCostUsd:x.averageCostUsd??null})));
  const value=previewHoldingValuation({ticker:h.ticker,accounts:relevant,assumedPriceUsd});
  return {ticker:h.ticker,status:value.costComplete?'COMPLETE_HYPOTHETICAL':'COST_MISSING',marketValueUsd:value.totalMarketValueUsd,unrealizedPnlUsd:value.totalUnrealizedPnlUsd};
 });
 const complete=rows.length>0&&rows.every(r=>r.status==='COMPLETE_HYPOTHETICAL');
 return {status:complete?'COMPLETE_HYPOTHETICAL':'PARTIAL_NOT_TOTALABLE',rows,totalMarketValueUsd:rows.every(r=>r.marketValueUsd!==null)?rows.reduce((s,r)=>s+r.marketValueUsd,0):null,totalUnrealizedPnlUsd:complete?rows.reduce((s,r)=>s+r.unrealizedPnlUsd,0):null,priceSource:'USER_ASSUMPTION_NOT_LIVE',canPersist:false,serverVerified:false};
}
