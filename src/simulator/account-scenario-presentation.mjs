// Presentation-only model; does not alter financial calculations.
export function summarizeAccountScenarioResults(comparison){
 if(!comparison||!Array.isArray(comparison.rows))throw Error('비교 결과가 없습니다');
 const rows=comparison.rows.flatMap(group=>group.results.map(result=>({
  account:group.accountNames.join(' + '),name:result.name,
  status:result.status,
  terminalValue:result.status==='CALCULATED'?result.terminalValue:null,
  deltaVsHold:result.status==='CALCULATED'?result.deltaVsHold:null,
  reason:result.status==='CALCULATED'?'':result.reason,
  finalCash:result.status==='CALCULATED'?result.finalCash:null,
  cashChange:result.status==='CALCULATED'?result.cashChange:null,
  quantityChanges:result.status==='CALCULATED'?result.quantityChanges:[]
 })));
 const available=rows.filter(r=>r.status==='CALCULATED');
 const unavailable=rows.length-available.length;
 const sorted=[...rows].sort((a,b)=>(a.status==='CALCULATED'?0:1)-(b.status==='CALCULATED'?0:1)||(b.deltaVsHold??-Infinity)-(a.deltaVsHold??-Infinity)||a.account.localeCompare(b.account)||a.name.localeCompare(b.name));
 return {rows:sorted,total:rows.length,available:available.length,unavailable,bestDelta:available.length?Math.max(...available.map(r=>r.deltaVsHold)):null,serverVerified:false};
}
