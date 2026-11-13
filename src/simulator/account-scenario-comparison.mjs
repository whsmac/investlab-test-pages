import {extractSimulatorCombinedOpening} from '../ledger/simulator-account-opening.mjs';
import {compareScenarios} from './scenario-comparison.mjs';
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
    row.results.push({name:scenario.name,status:'CALCULATED',terminalValue:item.terminalValue,deltaVsHold:item.deltaVsHold,finalCash:item.final.cash,realizedPnL:item.final.realizedPnL??null});
   }catch(error){row.results.push({name:scenario?.name??'',status:'UNAVAILABLE',reason:String(error.message),tradeIndex:error.tradeIndex??null,ticker:error.ticker??null})}
  }
  return row;
 });
 return {rows,taxStatus:'not_calculated',serverVerified:false,canPost:false,canMigrate:false};
}
