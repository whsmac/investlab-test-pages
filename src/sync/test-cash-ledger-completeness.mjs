// TEST-only cash ledger completeness assessment. No inferred opening balances or FX rates.
// A balance is not published until all cash-impacting rows are understood and an
// independently verified opening balance is supplied.
const ACCOUNT_KEYS=['account_id','portfolio_account_id','brokerage_account_id'];
const TYPES=new Set(['OPENING_CASH','DEPOSIT','CASH_DEPOSIT','WITHDRAWAL','CASH_WITHDRAWAL','BUY','SELL','DIVIDEND','INTEREST','FEE','TAX','FX','FX_CONVERSION','TRANSFER']);
export function assessTestCashLedger(rows){
 if(!Array.isArray(rows))throw Error('원장 배열 필요');
 const groups=new Map(),issues=[];
 for(let index=0;index<rows.length;index++){
  const row=rows[index];
  if(!row||typeof row!=='object'||Array.isArray(row)){issues.push({row:index+1,reason:'거래 행 형식 오류'});continue;}
  const type=String(row.transaction_type||'').toUpperCase();
  if(!TYPES.has(type)){issues.push({row:index+1,reason:'미지원 거래 유형 '+(type||'(없음)')});continue;}
  const ids=ACCOUNT_KEYS.map(k=>row[k]).filter(v=>v!=null&&String(v).trim()).map(String);
  if(!ids.length||new Set(ids).size!==1){issues.push({row:index+1,reason:'계좌 식별 불명확'});continue;}
  const accountId=ids[0],currency=String(row.currency||'').toUpperCase();
  if(!['USD','KRW'].includes(currency)){issues.push({row:index+1,reason:'통화 불명확'});continue;}
  const key=accountId+'|'+currency;
  if(!groups.has(key))groups.set(key,{accountId,currency,transactions:0,knownNetMovement:0,unresolved:0,openingBalance:null,cashBalance:null,verified:false});
  const group=groups.get(key);group.transactions++;
  if(type==='DEPOSIT'||type==='CASH_DEPOSIT'||type==='WITHDRAWAL'||type==='CASH_WITHDRAWAL'){
   const values=['amount','net_amount','gross_amount'].filter(k=>row[k]!=null&&row[k]!=='');
   const n=values.length===1?Number(row[values[0]]):NaN;
   if(!Number.isFinite(n)||n<=0){group.unresolved++;issues.push({row:index+1,reason:'입출금 금액 불명확'});continue;}
   group.knownNetMovement+=(type==='DEPOSIT'||type==='CASH_DEPOSIT'?1:-1)*n;
  }else{
   group.unresolved++;issues.push({row:index+1,reason:type+' 현금 영향 계산 규칙·금액 미검증'});
  }
 }
 return {accounts:[...groups.values()].sort((a,b)=>a.accountId.localeCompare(b.accountId)||a.currency.localeCompare(b.currency)),
  issues,complete:false,canApplyToPortfolio:false,canApplyToSimulator:false,canWrite:false,
  note:'시작잔고와 매매·배당·환전·수수료·세금의 정산 규칙이 검증되기 전까지 실제 현금잔고는 계산하지 않습니다.'};
}
