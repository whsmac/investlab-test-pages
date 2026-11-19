// TEST-only hypothetical cash reconciliation. Not a verified bank/broker balance.
// Only explicit amounts and a caller-supplied opening balance are used.
const KEYS=['account_id','portfolio_account_id','brokerage_account_id'];
const SIGNS={DEPOSIT:1,CASH_DEPOSIT:1,WITHDRAWAL:-1,CASH_WITHDRAWAL:-1,BUY:-1,SELL:1};
const own=(row,key)=>Object.prototype.hasOwnProperty.call(row,key);
function exactNonnegative(row,key){
 if(!own(row,key)||row[key]===null||row[key]===''||typeof row[key]==='boolean')return null;
 const n=Number(row[key]);return Number.isFinite(n)&&n>=0?n:null;
}
export function reconcileTestCashPreview(rows,{accountId,currency='USD',openingBalance}={}){
 if(!Array.isArray(rows))throw Error('원장 배열 필요');
 if(typeof accountId!=='string'||!accountId.trim()||!['USD','KRW'].includes(currency))throw Error('계좌·통화 확인 필요');
 if(typeof openingBalance!=='number'||!Number.isFinite(openingBalance)||openingBalance<0)throw Error('확인된 시작잔고를 숫자로 입력해야 합니다');
 let movement=0,applied=0;const issues=[];
 rows.forEach((row,i)=>{
  if(!row||typeof row!=='object'||Array.isArray(row)){issues.push({row:i+1,reason:'행 형식 오류'});return;}
  const ids=KEYS.filter(k=>row[k]!=null&&String(row[k]).trim()).map(k=>String(row[k]).trim());
  if(!ids.length){issues.push({row:i+1,reason:'계좌 미지정 거래: 잔고 영향 불명확'});return;}
  if(new Set(ids).size!==1){issues.push({row:i+1,reason:'계좌 식별자 충돌'});return;}
  if(ids[0]!==accountId)return;
  if(String(row.currency||'').toUpperCase()!==currency){issues.push({row:i+1,reason:'다른 통화 또는 통화 미확인: 환전 여부 검토 필요'});return;}
  const type=String(row.transaction_type||'').toUpperCase(),sign=SIGNS[type];
  if(!sign){issues.push({row:i+1,reason:'미지원 거래 유형 '+type});return;}
  let amount;
  if(type==='BUY'||type==='SELL'){
   // Gross amount is required; quantity × price can differ from broker settlement.
   amount=exactNonnegative(row,'gross_amount');
   const fees=exactNonnegative(row,'fees'),tax=exactNonnegative(row,'withholding_tax');
   if(amount===null||fees===null||tax===null){issues.push({row:i+1,reason:'매매대금·수수료·원천징수세액 미확인'});return;}
   movement+=sign*amount-fees-tax;
  }else{
   const populated=['amount','net_amount','gross_amount'].filter(k=>row[k]!=null&&row[k]!=='');
   amount=populated.length===1?exactNonnegative(row,populated[0]):null;
   if(amount===null||amount<=0){issues.push({row:i+1,reason:'입출금 금액 불명확'});return;}
   movement+=sign*amount;
  }
  applied++;
 });
 const complete=issues.length===0;
 return {accountId,currency,openingBalance,knownMovement:movement,previewBalance:complete?openingBalance+movement:null,
  appliedTransactions:applied,issues,complete,verified:false,canApplyToPortfolio:false,canApplyToSimulator:false,canWrite:false,
  note:'검토용 계산입니다. 시작잔고의 실제 기준일·결제일·정산규칙을 확인하지 않았으므로 실제 현금잔고로 확정할 수 없습니다.'};
}
