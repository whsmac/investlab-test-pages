// INVESTLAB TEST only: side-effect-free guards for automatically adopting a cloud ledger.
// This module never reads credentials or writes any browser/server data.
export function differentVerifiedUser(previousUserId, currentUserId) {
 return typeof previousUserId==='string'&&previousUserId.length>0&&
        typeof currentUserId==='string'&&currentUserId.length>0&&
        previousUserId!==currentUserId;
}

export function mayAutoApplyTestLedger({
 firstRead=false, positions=[], cash=0, hasDraft=false,
 explicitHandoff=false, userEdited=false, draftPending=false, ownerChanged=false
}={}) {
 const hasPositions=Array.isArray(positions)&&positions.length>0;
 const cashNumber=Number(cash);
 const hasCash=Number.isFinite(cashNumber)&&cashNumber>0;
 return Boolean(firstRead&&(hasPositions||hasCash)&&!hasDraft&&!explicitHandoff&&
                !userEdited&&!draftPending&&!ownerChanged);
}

/** Describe stale strategy opening values without mutating either opening. */
export function compareLedgerOpening({currentPositions=[],currentCash,freshPositions=[],freshCash}={}){
 const positions=list=>new Map((Array.isArray(list)?list:[]).map(p=>[String(p.ticker||'').toUpperCase(),p]));
 const a=positions(currentPositions),b=positions(freshPositions);
 const tickers=[...new Set([...a.keys(),...b.keys()])].sort();
 const near=(x,y,tolerance)=>Number.isFinite(Number(x))&&Number.isFinite(Number(y))&&Math.abs(Number(x)-Number(y))<=tolerance;
 const changedTickers=tickers.filter(t=>!a.has(t)||!b.has(t)||!near(a.get(t).quantity,b.get(t).quantity,1e-9)||!near(a.get(t).averageCost,b.get(t).averageCost,1e-7));
 const cashChanged=!near(currentCash,freshCash,1e-7);
 return {matches:!changedTickers.length&&!cashChanged,changedTickers,cashChanged};
}
