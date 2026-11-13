import {extractSimulatorCombinedOpening} from './simulator-account-opening.mjs';
export function compareSimulatorAccountOpenings({saved,accountGroups}={}){
 if(!Array.isArray(accountGroups)||!accountGroups.length||accountGroups.length>12)throw Error('비교할 계좌 그룹은 1~12개여야 합니다');
 const rows=accountGroups.map((group,index)=>{
  const opening=extractSimulatorCombinedOpening({saved,accountIds:group});
  const totalCostUsd=opening.positions.reduce((sum,p)=>sum+p.quantity*p.averageCost,0);
  if(!Number.isFinite(totalCostUsd))throw Error('취득원가 합산 오류');
  return {index,accountIds:opening.accountIds,accountNames:opening.accountNames,positionCount:opening.positions.length,usdCash:opening.usdCash,totalCostUsd,positions:opening.positions};
 });
 return {rows,serverVerified:false,canPost:false,canMigrate:false};
}
