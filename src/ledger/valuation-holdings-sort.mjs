// Pure, offline ordering of already calculated hypothetical valuation rows.
// Missing figures always follow calculated figures, in either direction.
const SORTS=new Set(['pnl-desc','pnl-asc','rate-desc','rate-asc']);
export function sortHoldingsByValuation(holdings,valuation,sort){
 if(!Array.isArray(holdings)||!valuation||!Array.isArray(valuation.rows)||!SORTS.has(sort))throw Error('invalid valuation sort input');
 const key=sort.startsWith('pnl-')?'unrealizedPnlUsd':'unrealizedPnlRatePct';
 const direction=sort.endsWith('-desc')?-1:1;
 const values=new Map();
 for(const row of valuation.rows){
  if(!row||typeof row.ticker!=='string'||values.has(row.ticker))throw Error('invalid valuation rows');
  const value=row[key];if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)))throw Error('invalid valuation value');
  values.set(row.ticker,value);
 }
 return [...holdings].sort((a,b)=>{
  const av=values.get(a.ticker)??null,bv=values.get(b.ticker)??null;
  if(av===null&&bv!==null)return 1;
  if(bv===null&&av!==null)return -1;
  if(av!==null&&bv!==null&&av!==bv)return (av-bv)*direction;
  return a.ticker.localeCompare(b.ticker);
 });
}
