// Deterministic display order only; does not select, execute or persist a strategy.
export function rankStrategyOutcomes(scenarios,criterion='value'){
 const metric={value:s=>s.terminalValue,tsla:s=>s.final?.positions?.TSLA?.quantity??0,cash:s=>s.final?.cash,taxAdjusted:s=>s.taxAdjustedValue};
 if(!Object.hasOwn(metric,criterion))throw Error('invalid comparison criterion');
 if(!Array.isArray(scenarios))throw Error('scenarios must be array');
 return scenarios.map((scenario,index)=>({scenario,index,score:metric[criterion](scenario)}))
  .sort((a,b)=>{const av=Number.isFinite(a.score)?a.score:-Infinity,bv=Number.isFinite(b.score)?b.score:-Infinity;return bv-av||a.index-b.index;})
  .map(({scenario})=>scenario);
}

// Compare each ranked scenario against the first-ranked scenario for the active criterion.
// Differences are signed (scenario minus leader), never persisted or used to execute trades.
export function compareRankedOutcomes(ranked){
 if(!Array.isArray(ranked))throw Error('ranked outcomes must be array');
 if(!ranked.length)return [];
 const numeric=(value)=>Number.isFinite(value)?value:null;
 const tsla=(scenario)=>scenario.final?.positions?.TSLA?.quantity??0;
 const leader=ranked[0];
 return ranked.map((scenario,index)=>({
  scenario,index,
  valueDelta:numeric(scenario.terminalValue)!==null&&numeric(leader.terminalValue)!==null?scenario.terminalValue-leader.terminalValue:null,
  tslaDelta:numeric(tsla(scenario))!==null&&numeric(tsla(leader))!==null?tsla(scenario)-tsla(leader):null,
  cashDelta:numeric(scenario.final?.cash)!==null&&numeric(leader.final?.cash)!==null?scenario.final.cash-leader.final.cash:null
 }));
}
