// Offline-only diagnostics. Field names are candidates, not verified database requirements.
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const numeric=/^(?:amount|quantity|shares|price|fee|tax|fx_rate|exchange_rate|average_cost|unit_price|total|balance)$/i;
const dates=/^(?:date|trade_date|transaction_date|settlement_date)$/i;
export function inspectLedgerTransactionValues(ledger,{section='transactions'}={}){
 if(!plain(ledger)||!Array.isArray(ledger[section]))throw Error('원장 거래 배열을 찾을 수 없습니다');
 const rows=ledger[section];if(rows.length>50000)throw Error('거래 50,000건 초과: 분할 검사가 필요합니다');
 const issues=[];let examined=0;
 for(let i=0;i<rows.length;i++){
  const row=rows[i];
  if(!plain(row)){issues.push({row:i+1,field:'(row)',reason:'거래 행이 객체가 아닙니다'});continue;}
  examined++;
  for(const [field,value] of Object.entries(row)){
   if(numeric.test(field)&&value!==null&&value!==undefined&&value!==''){
    const n=typeof value==='number'?value:typeof value==='string'&&/^-?\d+(?:\.\d+)?$/.test(value.trim())?Number(value):NaN;
    if(!Number.isFinite(n))issues.push({row:i+1,field,reason:'숫자 형식 확인 필요'});
   }
   if(dates.test(field)&&value!==null&&value!==undefined&&value!==''){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)issues.push({row:i+1,field,reason:'YYYY-MM-DD 날짜 형식 확인 필요'});
   }
  }
 }
 return {rows:rows.length,examined,issues:issues.slice(0,200),issueCount:issues.length,checks:'OPTIONAL_FIELD_FORMAT_ONLY',requiredColumnsVerified:false,dbSchemaVerified:false,canPost:false,canSync:false};
}
