import {compareScenarios} from './scenario-comparison.mjs';
// Recalculate a proposed smaller trade without mutating the original strategy or portfolio.
export function previewAdjustedScenario({portfolio,scenario,terminalPrices,diagnostic,adjustment}={}){
 if(!portfolio||!scenario||!Array.isArray(scenario.trades)||!diagnostic||!adjustment)return null;
 const index=diagnostic.tradeNumber-1;
 if(!Number.isInteger(index)||index<0||index>=scenario.trades.length)return null;
 const original=scenario.trades[index];
 if(!original||original.ticker!==diagnostic.ticker)return null;
 const quantity=adjustment.kind==='CASH'?adjustment.maxAffordableQuantity:adjustment.kind==='SHARES'?adjustment.maxSellQuantity:null;
 if(!Number.isFinite(quantity)||quantity<=0||quantity>=original.quantity)return {status:'NOT_APPLICABLE',reason:'조정 가능한 양수 거래수량이 없습니다',originalQuantity:original.quantity,proposedQuantity:quantity};
 const adjusted={...scenario,trades:scenario.trades.map((trade,i)=>i===index?{...trade,quantity}:{...trade})};
 try{
  const result=compareScenarios(portfolio,[adjusted],terminalPrices);
  const item=result.scenarios[0];
  return {status:'CALCULATED',tradeNumber:index+1,originalQuantity:original.quantity,proposedQuantity:quantity,terminalValue:item.terminalValue,deltaVsHold:item.deltaVsHold,finalCash:item.final.cash,finalPositions:Object.fromEntries(Object.entries(item.final.positions).filter(([,p])=>p.quantity>0).map(([ticker,p])=>[ticker,p.quantity])),completedSteps:item.steps.length,serverVerified:false,canPost:false};
 }catch(error){
  return {status:'STILL_UNAVAILABLE',tradeNumber:index+1,originalQuantity:original.quantity,proposedQuantity:quantity,reason:String(error.message),nextFailedTradeNumber:Number.isInteger(error.tradeIndex)?error.tradeIndex+1:null,serverVerified:false,canPost:false};
 }
}
