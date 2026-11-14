// Offline quantity summary. Integer arithmetic avoids floating point rounding.
const DEC=/^(0|[1-9]\d*)(?:\.\d{1,8})?$/;
function toUnits(v){const s=String(v??'');if(!DEC.test(s))return null;const [a,b='']=s.split('.');return BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'))}
function fmt(n){const neg=n<0n,abs=neg?-n:n;return (neg?'-':'')+(abs/100000000n).toString()+'.'+(abs%100000000n).toString().padStart(8,'0')}
export function summarizeAllocationQuantities({holdings,positionRows}={}){
 if(!Array.isArray(holdings)||!Array.isArray(positionRows))throw Error('holdings and position rows required');
 const seen=new Set(),assigned=new Map(),invalid=new Set();
 for(const row of positionRows){if(!row||typeof row.ticker!=='string')continue;const amount=toUnits(row.quantity);if(amount===null){invalid.add(row.ticker);continue}assigned.set(row.ticker,(assigned.get(row.ticker)||0n)+amount)}
 const rows=holdings.map(h=>{if(!h||seen.has(h.symbol))throw Error('duplicate or invalid holding');seen.add(h.symbol);const total=toUnits(h.shares),used=assigned.get(h.symbol)||0n;if(total===null)throw Error('invalid original holding quantity');const remainder=total-used;return {ticker:h.symbol,original:fmt(total),assigned:fmt(used),remaining:fmt(remainder),status:invalid.has(h.symbol)?'입력 오류':remainder<0n?'초과 배정':remainder>0n?'미배정':'수량 일치'}});
 for(const ticker of assigned.keys())if(!seen.has(ticker))throw Error('unknown allocation ticker');
 return {rows,allMatched:rows.every(r=>r.status==='수량 일치'),canMigrate:false,serverVerified:false};
}
