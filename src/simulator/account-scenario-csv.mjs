const cell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
export function accountScenarioStepsCsv(comparison){
 if(!comparison||!Array.isArray(comparison.rows))throw Error('비교 결과가 없습니다');
 const lines=[['계좌','전략','상태','단계','매수매도','종목','수량','체결가 USD','수수료 USD','거래 후 현금 USD','해당 거래 실현손익 USD','누적 실현손익 USD','거래 후 보유수량','오류 사유']];
 for(const group of comparison.rows){
  const account=group.accountNames.join(' + ');
  for(const result of group.results){
   if(result.status!=='CALCULATED'){lines.push([account,result.name,'실행 불가','','','','','','','','','','',result.reason??'']);continue}
   if(!result.steps.length){lines.push([account,result.name,'거래 없음','','','','','','',result.finalCash,'','','','']);continue}
   for(const step of result.steps)lines.push([account,result.name,'실행 가능',step.index,step.side==='buy'?'매수':'매도',step.ticker,step.quantity,step.price,step.fee,step.cashAfter,step.realizedPnL,step.cumulativeRealizedPnL,Object.entries(step.positionsAfter).map(([ticker,quantity])=>ticker+':'+quantity).join('; '),'']);
  }
 }
 return '\uFEFF'+lines.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
