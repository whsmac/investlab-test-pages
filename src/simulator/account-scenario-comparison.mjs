import {extractSimulatorCombinedOpening} from '../ledger/simulator-account-opening.mjs';
import {compareScenarios} from './scenario-comparison.mjs';
import {diagnoseScenarioFailure} from './scenario-failure-diagnostic.mjs';
// Read-only scenario comparison across account baselines. Never mutates saved strategies.
export function compareAccountScenarios({saved,accountGroups,scenarios,terminalPrices}={}){
 if(!Array.isArray(accountGroups)||!accountGroups.length||accountGroups.length>101)throw Error('계좌 비교 그룹을 확인하세요');
 if(!Array.isArray(scenarios)||!scenarios.length)throw Error('비교할 전략이 없습니다');
 const rows=accountGroups.map(group=>{
  const opening=extractSimulatorCombinedOpening({saved,accountIds:group});
  const positions=Object.fromEntries(opening.positions.map(p=>[p.ticker,{quantity:p.quantity,averageCost:p.averageCost}]));
  const row={accountIds:opening.accountIds,accountNames:opening.accountNames,usdCash:opening.usdCash,results:[],baselineValue:null};
  // Keep failures isolated: a trade possible in all accounts may fail in one account.
  for(const scenario of scenarios){
   try{
    const result=compareScenarios({cash:opening.usdCash,positions},[scenario],terminalPrices);
    row.baselineValue=result.baseline.terminalValue;
    const item=result.scenarios[0];
    const tickers=[...new Set([...Object.keys(positions),...Object.keys(item.final.positions)])].sort();const quantityChanges=tickers.map(ticker=>({ticker,before:positions[ticker]?.quantity??0,after:item.final.positions[ticker]?.quantity??0,change:(item.final.positions[ticker]?.quantity??0)-(positions[ticker]?.quantity??0)})).filter(p=>p.change!==0);row.results.push({name:scenario.name,status:'CALCULATED',terminalValue:item.terminalValue,deltaVsHold:item.deltaVsHold,finalCash:item.final.cash,cashChange:item.final.cash-opening.usdCash,quantityChanges,steps:item.steps.map(step=>({index:step.index+1,side:step.side,ticker:step.ticker,quantity:step.quantity,price:step.price,fee:step.fee,cashAfter:step.cash,realizedPnL:step.tradePnL,cumulativeRealizedPnL:step.cumulativeRealizedPnL,positionsAfter:Object.fromEntries(Object.entries(step.positions).filter(([,p])=>p.quantity>0).map(([ticker,p])=>[ticker,p.quantity]))})),realizedPnL:item.final.realizedPnL??null});
   }catch(error){row.results.push({name:scenario?.name??'',status:'UNAVAILABLE',reason:String(error.message),tradeIndex:error.tradeIndex??null,ticker:error.ticker??null,diagnostic:diagnoseScenarioFailure({portfolio:{cash:opening.usdCash,positions},trades:scenario?.trades,tradeIndex:error.tradeIndex,reason:error.reason})})}
  }
  return row;
 });
 return {rows,taxStatus:'not_calculated',serverVerified:false,canPost:false,canMigrate:false};
}
