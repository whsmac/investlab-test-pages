// Read-only, account-scoped cost review matching. Weighted average is a suggestion only.
const DEC=/^(0|[1-9]\d*)(?:\.\d{1,8})?$/;
export function matchAccountCosts(holdings,report){
 if(!Array.isArray(holdings)||!report||report.format!=='INVESTLAB_ACCOUNT_COST_BASIS_REVIEW'||report.version!==1||report.canPersist!==false||report.serverVerified!==false||!Array.isArray(report.rows))throw Error('invalid account cost review report');
 const seen=new Set(),group=new Map();
 for(const row of report.rows){
  if(!row||typeof row.accountId!=='string'||typeof row.ticker!=='string'||typeof row.quantity!=='string'||!DEC.test(row.quantity))throw Error('invalid report row');
  const key=row.accountId+'|'+row.ticker;if(seen.has(key))throw Error('duplicate account ticker');seen.add(key);
  if(row.averageCostUsd!==null&&(typeof row.averageCostUsd!=='string'||!DEC.test(row.averageCostUsd)))throw Error('invalid account cost');
  const list=group.get(row.ticker)||[];list.push(row);group.set(row.ticker,list);
 }
 return holdings.map(holding=>{
  const rows=group.get(holding.ticker)||[];
  const quantity=Number(holding.quantity),total=rows.reduce((sum,row)=>sum+Number(row.quantity),0);
  const valid=rows.length>0&&rows.every(row=>row.averageCostUsd!==null)&&Math.abs(total-quantity)<1e-8&&quantity>0;
  const weighted=valid?rows.reduce((sum,row)=>sum+Number(row.quantity)*Number(row.averageCostUsd),0)/total:null;
  return {ticker:holding.ticker,quantity:holding.quantity,suggestedCost:weighted,status:valid?'WEIGHTED_REVIEW_REQUIRED':rows.length?'INCOMPLETE_OR_QUANTITY_MISMATCH':'NOT_FOUND',accountCount:rows.length};
 });
}
