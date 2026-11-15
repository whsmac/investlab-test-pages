// Deterministic display order only; does not select, execute or persist a strategy.
export function rankStrategyOutcomes(scenarios,criterion='value'){
 const metric={value:s=>s.terminalValue,tsla:s=>s.final?.positions?.TSLA?.quantity??0,cash:s=>s.final?.cash};
 if(!Object.hasOwn(metric,criterion))throw Error('invalid comparison criterion');
 if(!Array.isArray(scenarios))throw Error('scenarios must be array');
 return scenarios.map((scenario,index)=>({scenario,index,score:metric[criterion](scenario)}))
  .sort((a,b)=>{const av=Number.isFinite(a.score)?a.score:-Infinity,bv=Number.isFinite(b.score)?b.score:-Infinity;return bv-av||a.index-b.index;})
  .map(({scenario})=>scenario);
}
