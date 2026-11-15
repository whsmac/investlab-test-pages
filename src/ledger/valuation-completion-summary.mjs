// Read-only status derived from hypothetical valuation results.
export function summarizeValuationCompletion(result){
 if(!result||!Array.isArray(result.rows))throw Error('invalid valuation result');
 const missingPrice=[],missingCost=[],complete=[];
 for(const row of result.rows){
  if(!row||typeof row.ticker!=='string')throw Error('invalid valuation row');
  if(row.status==='PRICE_MISSING')missingPrice.push(row.ticker);
  else if(row.status==='COST_MISSING')missingCost.push(row.ticker);
  else if(row.status==='COMPLETE_HYPOTHETICAL')complete.push(row.ticker);
  else throw Error('unknown valuation status');
 }
 return {total:result.rows.length,completeCount:complete.length,missingPrice,missingCost,complete,fullyCalculated:result.rows.length>0&&missingPrice.length===0&&missingCost.length===0,canPersist:false,serverVerified:false};
}
