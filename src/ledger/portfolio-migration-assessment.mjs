// Pure, read-only portfolio migration assessment. No storage/network writes.
const SYMBOL=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
const DEC=/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;
const normalize=(value)=>{
 if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0?String(value):null;
 if(typeof value!=='string')return null;
 const cleaned=value.trim().replace(/,/g,'');
 return DEC.test(cleaned)?cleaned:null;
};
export function assessPortfolioMigration(input){
 if(!input||!Array.isArray(input.holdings))throw Error('holdings must be an array');
 const rows=[],warnings=[],seen=new Set();
 for(const [index,item] of input.holdings.entries()){
  if(!item||typeof item!=='object'||Array.isArray(item)){warnings.push('row '+(index+1)+': invalid item');continue;}
  const ticker=String(item.symbol??item.ticker??'').trim().toUpperCase();
  if(!SYMBOL.test(ticker)){warnings.push('row '+(index+1)+': invalid ticker');continue;}
  if(seen.has(ticker)){warnings.push(ticker+': duplicate ticker; account allocation unknown');continue;}
  seen.add(ticker);
  if(ticker==='USD-CASH'||ticker==='USD'||ticker==='KRW'){
   warnings.push(ticker+': cash requires separate account/currency confirmation');
   continue;
  }
  const quantity=normalize(item.shares??item.quantity);
  const averageCostUsd=normalize(item.avg_cost??item.averageCost);
  if(quantity===null||averageCostUsd===null){
   warnings.push(ticker+': quantity or USD cost missing/ambiguous');
   continue;
  }
  rows.push({ticker,quantity,averageCostUsd,requiresAccountAssignment:true,readyToImport:false});
 }
 return {sourceCount:input.holdings.length,recognizedCount:rows.length,rows,warnings,
  requires:['account mapping','cash opening balance','cost-basis verification','authenticated RLS tests'],
  status:'ASSESSMENT_ONLY_NO_UPLOAD'};
}
