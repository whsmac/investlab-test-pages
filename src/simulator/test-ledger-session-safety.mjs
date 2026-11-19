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
