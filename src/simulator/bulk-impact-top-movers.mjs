// Read-only top movers by absolute hypothetical P&L change.
export function topBulkImpactMovers(rows,limit=3){
 if(!Array.isArray(rows)||!Number.isInteger(limit)||limit<0)throw Error('invalid top movers input');
 return rows.filter(item=>item&&item.comparable&&Number.isFinite(item.pnlChangeUsd))
  .sort((a,b)=>Math.abs(b.pnlChangeUsd)-Math.abs(a.pnlChangeUsd)||String(a.ticker).localeCompare(String(b.ticker)))
  .slice(0,limit).map(item=>({ticker:item.ticker,pnlChangeUsd:item.pnlChangeUsd,oldPnlUsd:item.oldPnlUsd,newPnlUsd:item.newPnlUsd}));
}
