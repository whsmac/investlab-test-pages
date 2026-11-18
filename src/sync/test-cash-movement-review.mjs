// TEST-only conservative cash movement analysis. This is NOT an account cash balance.
// No initial balances, settlement rules, fees or FX direction are inferred.
const accountFields=['account_id','portfolio_account_id','brokerage_account_id'];
const directions={DEPOSIT:1,CASH_DEPOSIT:1,WITHDRAWAL:-1,CASH_WITHDRAWAL:-1};
function amountOf(row){
 const candidates=['amount','net_amount','gross_amount'].filter(k=>row[k]!=null&&row[k]!=='');
 if(candidates.length!==1)return null;
 const n=Number(row[candidates[0]]);
 return Number.isFinite(n)&&n>0?n:null;
}
export function reviewTestCashMovements(rows){
 if(!Array.isArray(rows))throw Error('원장 배열 필요');
 const grouped=new Map();let excluded=0,unknownAccount=0,unresolved=0;
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('원장 행 형식 오류');
  const type=String(row.transaction_type||'').toUpperCase();
  if(!(type in directions)){excluded++;continue;}
  const fields=accountFields.filter(k=>row[k]!=null&&String(row[k]).trim()!=='');
  if(fields.length>1&&new Set(fields.map(k=>String(row[k]).trim())).size>1){unresolved++;continue;}
  const accountId=fields.length?String(row[fields[0]]).trim():null;
  if(!accountId){unknownAccount++;continue;}
  const currency=String(row.currency||'').toUpperCase();
  const amount=amountOf(row);
  if(!['USD','KRW'].includes(currency)||amount===null){unresolved++;continue;}
  const key=accountId+'|'+currency;
  const entry=grouped.get(key)||{accountId,currency,depositCount:0,withdrawalCount:0,netRecordedMovement:0};
  entry.netRecordedMovement+=directions[type]*amount;
  if(directions[type]>0)entry.depositCount++;else entry.withdrawalCount++;
  grouped.set(key,entry);
 }
 return {movements:[...grouped.values()].sort((a,b)=>a.accountId.localeCompare(b.accountId)||a.currency.localeCompare(b.currency)),
  excluded,unknownAccount,unresolved,
  cashBalance:null,cashVerified:false,canApplyToPortfolio:false,canApplyToSimulator:false,canWrite:false,
  note:'표시된 금액은 명시적 입출금 거래의 순변동 참고값입니다. 시작잔고·매매대금·배당·환전·수수료가 반영된 실제 현금잔고가 아닙니다.'};
}
