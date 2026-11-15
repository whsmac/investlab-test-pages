// Pure summary of a completed hypothetical trade sequence; no live prices or persistence.
export function summarizeTradeOutcome(initial,final,steps){
 if(!initial||!final||!Array.isArray(steps))throw Error('invalid trade outcome');
 const cashChange=final.cash-initial.cash;
 const initialTsla=initial.positions?.TSLA?.quantity??0;
 const finalTsla=final.positions?.TSLA?.quantity??0;
 const tslaChange=finalTsla-initialTsla;
 const realizedPnL=final.realizedPnL;
 if(![cashChange,initialTsla,finalTsla,realizedPnL].every(Number.isFinite))throw Error('invalid trade outcome values');
 return {stepCount:steps.length,initialCash:initial.cash,finalCash:final.cash,cashChange,initialTsla,finalTsla,tslaChange,realizedPnL,canPersist:false,includesUnrealizedPnL:false};
}
