// TEST-only ledger account/cash readiness. Never infer cash from stock buys alone.
const accountFields=['account_id','portfolio_account_id','brokerage_account_id'];
const cashTypes=new Set(['DEPOSIT','WITHDRAWAL','CASH_DEPOSIT','CASH_WITHDRAWAL','FX','FX_CONVERSION','DIVIDEND','INTEREST','FEE','TRANSFER']);
export function inspectLedgerAccountCashReadiness(rows){
 if(!Array.isArray(rows))throw Error('원장 조회 결과가 배열이 아닙니다');
 const keys=new Set(),types=new Map(),accounts=new Set();
 let accountTagged=0,untagged=0,cashRelated=0,invalid=0;
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row)){invalid++;continue;}
  Object.keys(row).forEach(k=>keys.add(k));
  const type=String(row.transaction_type||'').toUpperCase();
  types.set(type||'(미기재)',(types.get(type||'(미기재)')||0)+1);
  const field=accountFields.find(k=>row[k]!=null&&String(row[k]).trim()!=='');
  if(field){accountTagged++;accounts.add(String(row[field]));}else untagged++;
  if(cashTypes.has(type))cashRelated++;
 }
 const accountColumns=accountFields.filter(k=>keys.has(k));
 const cashColumns=['gross_amount','net_amount','amount','from_amount','to_amount','fees','currency','from_currency','to_currency'].filter(k=>keys.has(k));
 const issues=[];
 if(!accountColumns.length)issues.push('계좌 식별 컬럼을 조회 결과에서 확인하지 못했습니다');
 if(untagged)issues.push('계좌 미지정 거래 '+untagged+'건');
 if(!cashRelated)issues.push('현금 관련 거래 기록을 확인하지 못했습니다');
 if(invalid)issues.push('형식 오류 행 '+invalid+'건');
 return {rows:rows.length,accountColumns,cashColumns,accountTagged,untagged,accountCount:accounts.size,cashRelated,transactionTypes:[...types].sort((a,b)=>a[0].localeCompare(b[0])).map(([type,count])=>({type,count})),issues,canCalculateAccountCash:false,canClaimRls:false,canWrite:false};
}
