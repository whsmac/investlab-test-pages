// Sort read-only price impact rows. Incomplete comparisons always last.
export function sortBulkImpactRows(rows,mode='pnl-desc'){
 if(!Array.isArray(rows))throw Error('rows must be array');
 const direction=mode==='pnl-asc'?1:-1;
 if(!['pnl-desc','pnl-asc','ticker-asc'].includes(mode))throw Error('unsupported impact sort');
 return [...rows].sort((a,b)=>{
  const av=a.comparable&&Number.isFinite(a.pnlChangeUsd),bv=b.comparable&&Number.isFinite(b.pnlChangeUsd);
  if(av!==bv)return av?-1:1;
  if(mode==='ticker-asc'||!av)return String(a.ticker).localeCompare(String(b.ticker));
  return direction*(a.pnlChangeUsd-b.pnlChangeUsd)||String(a.ticker).localeCompare(String(b.ticker));
 });
}
