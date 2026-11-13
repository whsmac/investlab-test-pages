import {simulateTrades} from './virtual-trade-engine.mjs';
// Diagnose a failed trade from the last valid state, without executing the failing trade.
export function diagnoseScenarioFailure({portfolio,trades,tradeIndex,reason}={}){
 if(!Number.isInteger(tradeIndex)||tradeIndex<0||!Array.isArray(trades)||tradeIndex>=trades.length)return null;
 if(reason!=='insufficient cash'&&reason!=='insufficient shares')return null;
 const prior=simulateTrades(portfolio,trades.slice(0,tradeIndex));
 const trade=trades[tradeIndex];
 if(!trade||!Number.isFinite(trade.quantity)||!Number.isFinite(trade.price)||!Number.isFinite(trade.fee??0))return null;
 const completedHistory=prior.steps.map(step=>({index:step.index+1,side:step.side,ticker:step.ticker,quantity:step.quantity,price:step.price,fee:step.fee,cashAfter:step.cash,realizedPnL:step.tradePnL,positionsAfter:Object.fromEntries(Object.entries(step.positions).filter(([,p])=>p.quantity>0).map(([ticker,p])=>[ticker,p.quantity]))}));
 const positionsBefore=Object.fromEntries(Object.entries(prior.final.positions).filter(([,p])=>p.quantity>0).map(([ticker,p])=>[ticker,p.quantity]));
 const cashAvailable=prior.final.cash;
 const sharesAvailable=prior.final.positions[trade.ticker]?.quantity??0;
 if(reason==='insufficient cash'){
  const required=trade.quantity*trade.price+(trade.fee??0);
  return {tradeNumber:tradeIndex+1,ticker:trade.ticker,kind:'CASH',required,available:cashAvailable,shortfall:Math.max(0,required-cashAvailable),completedSteps:prior.steps.length,cashBefore:cashAvailable,positionsBefore,completedHistory};
 }
 return {tradeNumber:tradeIndex+1,ticker:trade.ticker,kind:'SHARES',required:trade.quantity,available:sharesAvailable,shortfall:Math.max(0,trade.quantity-sharesAvailable),completedSteps:prior.steps.length,cashBefore:cashAvailable,positionsBefore,completedHistory};
}
