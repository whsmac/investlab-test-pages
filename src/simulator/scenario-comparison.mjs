import {simulateTrades} from './virtual-trade-engine.mjs';

/** Compare planned trades with unchanged holdings using user-supplied terminal prices.
 * All amounts must share a single currency; tax is not yet calculated.
 */
export function compareScenarios(portfolio, scenarios, terminalPrices) {
  if (!Array.isArray(scenarios) || scenarios.length===0) throw new Error('scenarios required');
  if (!terminalPrices || typeof terminalPrices!=='object' || Array.isArray(terminalPrices)) throw new Error('terminal prices required');
  const valueOf = (result, prices) => {
    let value=result.final.cash;
    for (const [ticker,p] of Object.entries(result.final.positions)) {
      if (!p.quantity) continue;
      const price=prices[ticker];
      if (typeof price!=='number' || !Number.isFinite(price) || price<0) throw new Error(`missing or invalid terminal price: ${ticker}`);
      value+=p.quantity*price;
    }
    if (!Number.isFinite(value)) throw new Error('valuation overflow');
    return Math.round((value+Number.EPSILON)*1e8)/1e8;
  };
  const baseline=simulateTrades(portfolio,[]);
  const baselineValue=valueOf(baseline,terminalPrices);
  const seen=new Set();
  return {baseline:{...baseline,terminalValue:baselineValue},scenarios:scenarios.map(s=>{
    if (!s || typeof s.name!=='string' || !s.name.trim() || seen.has(s.name)) throw new Error('scenario name must be unique');
    seen.add(s.name);
    let result;
    try{result=simulateTrades(portfolio,s.trades);}
    catch(error){
      if(/^(insufficient cash|insufficient shares) at (\d+)$/.test(error.message)){
        const [,reason,index]=error.message.match(/^(insufficient cash|insufficient shares) at (\d+)$/);
        const failure=new Error('scenario trade unavailable');
        failure.scenarioName=s.name;
        failure.tradeIndex=Number(index);
        failure.reason=reason;
        failure.ticker=s.trades[Number(index)]?.ticker;
        throw failure;
      }
      throw error;
    }
    const prices={...terminalPrices,...(s.terminalPrices??{})};
    const terminalValue=valueOf(result,prices);
    const scenarioBaselineValue=valueOf(baseline,prices);
    return {name:s.name,...result,terminalValue,baselineTerminalValue:scenarioBaselineValue,deltaVsHold:Math.round((terminalValue-scenarioBaselineValue+Number.EPSILON)*1e8)/1e8};
  }),taxStatus:'not_calculated'};
}

/** Non-traded holdings may be valued at a recent verified close, as an explicit
 * unchanged-price assumption for this calculation only. Never mutate saved prices,
 * use stale/missing quotes, or silently assume a price for a traded ticker. */
export function resolvePassiveTerminalPrices({positions,scenarios,manualPrices,closes,dates,now=Date.now()}){
 const prices={...manualPrices},automatic=[],missing=[],traded=new Set(scenarios.flatMap(s=>s.trades.map(t=>t.ticker)));
 const required=new Set([...Object.keys(positions).filter(t=>positions[t].quantity>0),...traded]);
 for(const ticker of required){
  if(Object.hasOwn(prices,ticker)&&Number.isFinite(prices[ticker])&&prices[ticker]>=0)continue;
  if(!traded.has(ticker)){
   const price=closes.get(ticker),date=dates.get(ticker),stamp=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?Date.parse(date+'T00:00:00Z'):NaN,age=(now-stamp)/86400000;
   if(Number.isFinite(price)&&price>0&&Number.isFinite(age)&&age>=-1&&age<=7){prices[ticker]=price;automatic.push({ticker,price,date});continue;}
  }
  missing.push(ticker);
 }
 return {prices,automatic,missing};
}
