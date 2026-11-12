import {summarizeAllocationQuantities} from './opening-allocation-quantities.mjs';
// Read-only readiness: never approves DB writes or migration.
export function summarizeOpeningAccountReadiness({holdings,accounts,positionRows}={}){
 if(!Array.isArray(accounts)||!Array.isArray(positionRows))throw Error('accounts and position rows required');
 const quantities=summarizeAllocationQuantities({holdings,positionRows});
 const accountMap=new Map();
 for(const account of accounts){if(!account||typeof account.id!=='string'||!account.id||accountMap.has(account.id.toLowerCase()))throw Error('duplicate or invalid account');accountMap.set(account.id.toLowerCase(),account)}
 const rows=positionRows.map(row=>{
  const account=accountMap.get(String(row?.accountId??'').toLowerCase());
  if(!account)throw Error('unknown account in position row');
  const quantity=quantities.rows.find(r=>r.ticker===row.ticker);
  if(!quantity)throw Error('unknown ticker in position row');
  const ownership=account.ownerConfirmed===true?'확인':'미확인';
  const cost=row.costConfirmed===true?'확인':'미확인';
  const status=quantity.status==='수량 일치'&&ownership==='확인'&&cost==='확인'?'오프라인 검토 준비':'추가 확인 필요';
  return {account:account.name,ticker:row.ticker,quantity:row.quantity,quantityStatus:quantity.status,ownership,cost,status};
 });
 const missing=rows.filter(row=>row.status!=='오프라인 검토 준비');
 return {rows,missingCount:missing.length,allReady:quantities.allMatched&&rows.length>0&&missing.length===0,quantities,serverVerified:false,canMigrate:false,canPost:false};
}
