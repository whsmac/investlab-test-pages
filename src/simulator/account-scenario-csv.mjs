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

/** Export the same account/scenario figures as the comparison table.
 * Separate from trade-step CSV; no ledger writes or tax aggregation.
 */
export function accountScenarioSummaryCsv(comparison){
 if(!comparison||!Array.isArray(comparison.rows))throw Error('비교 결과가 없습니다');
 const lines=[['계좌','계산 기준','전략','실행 상태','최종 평가액 USD','보유 유지 대비 USD','시작 현금 USD','최종 현금 USD','현금 증감 USD','실현손익 USD (계좌 기준)','수량 변화']];
 for(const group of comparison.rows){
  const account=group.accountNames.join(' + ');
  const basis=group.accountIds.length>1?'전체 합산 (가중평균)':'개별 계좌';
  for(const result of group.results){
   const ok=result.status==='CALCULATED';
   const changes=ok?(result.quantityChanges.length?result.quantityChanges.map(p=>p.ticker+' '+(p.change>0?'+':'')+p.change+'주').join(' · '):'변동 없음'):'';
   lines.push([account,basis,result.name,ok?'실행 가능':'실행 불가: '+(result.reason??''),
    ok?result.terminalValue:'',ok?result.deltaVsHold:'',group.usdCash,
    ok?result.finalCash:'',ok?result.cashChange:'',ok?result.realizedPnL??'':'',changes]);
  }
 }
 return '\uFEFF'+lines.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
