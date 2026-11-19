// Presentation-only model; does not alter financial calculations.
export function summarizeAccountScenarioResults(comparison){
 if(!comparison||!Array.isArray(comparison.rows))throw Error('비교 결과가 없습니다');
 const rows=comparison.rows.flatMap(group=>group.results.map(result=>({
  account:group.accountNames.join(' + '),accountBasis:(Array.isArray(group.accountIds)?group.accountIds.length:group.accountNames.length)>1?'전체 합산 (가중평균)':'개별 계좌',openingCash:group.usdCash,name:result.name,
  status:result.status,
  terminalValue:result.status==='CALCULATED'?result.terminalValue:null,
  deltaVsHold:result.status==='CALCULATED'?result.deltaVsHold:null,
  reason:result.status==='CALCULATED'?'':result.reason,
  diagnostic:result.status==='CALCULATED'?null:result.diagnostic??null,
  adjustment:result.status==='CALCULATED'?null:result.adjustment??null,
  adjustmentPreview:result.status==='CALCULATED'?null:result.adjustmentPreview??null,
  finalCash:result.status==='CALCULATED'?result.finalCash:null,
  realizedPnL:result.status==='CALCULATED'?result.realizedPnL??null:null,
  cashChange:result.status==='CALCULATED'?result.cashChange:null,
  quantityChanges:result.status==='CALCULATED'?result.quantityChanges:[],
  steps:result.status==='CALCULATED'?result.steps:[]
 })));
 const available=rows.filter(r=>r.status==='CALCULATED');
 const unavailable=rows.length-available.length;
 const sorted=[...rows].sort((a,b)=>(a.status==='CALCULATED'?0:1)-(b.status==='CALCULATED'?0:1)||(b.deltaVsHold??-Infinity)-(a.deltaVsHold??-Infinity)||a.account.localeCompare(b.account)||a.name.localeCompare(b.name));
 return {rows:sorted,total:rows.length,available:available.length,unavailable,bestDelta:available.length?Math.max(...available.map(r=>r.deltaVsHold)):null,serverVerified:false};
}

/**
 * Explain why a blended multi-account cost basis can disagree with the sum of
 * account-level realized gains. Only compare a complete set of single-account
 * successes with the matching combined group, for the same named scenario.
 * This is not a tax aggregation or a ledger posting.
 */
export function compareAccountRealizedGains(comparison){
 if(!comparison||!Array.isArray(comparison.rows))throw Error('비교 결과가 없습니다');
 const singles=comparison.rows.filter(group=>Array.isArray(group.accountIds)&&group.accountIds.length===1);
 const combined=comparison.rows.filter(group=>Array.isArray(group.accountIds)&&group.accountIds.length>1);
 const results=[];
 for(const group of combined){
  const ids=group.accountIds;
  if(new Set(ids).size!==ids.length)continue;
  const matching=ids.map(id=>singles.find(single=>single.accountIds[0]===id));
  if(matching.some(x=>!x))continue;
  for(const item of group.results??[]){
   const individual=matching.map(single=>(single.results??[]).find(r=>r.name===item.name));
   if(item.status!=='CALCULATED'||!Number.isFinite(item.realizedPnL)||individual.some(r=>!r||r.status!=='CALCULATED'||!Number.isFinite(r.realizedPnL)))continue;
   const sum=individual.reduce((total,r)=>total+r.realizedPnL,0);
   const difference=item.realizedPnL-sum;
   results.push({scenario:item.name,accounts:group.accountNames.join(' + '),accountSumRealizedPnL:sum,blendedRealizedPnL:item.realizedPnL,difference,hasDifference:Math.abs(difference)>1e-8});
  }
 }
 return results;
}
