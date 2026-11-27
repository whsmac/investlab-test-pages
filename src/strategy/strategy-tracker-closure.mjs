// Frozen closure records distinguish actual held target from hypothetical conversion.
function finite(n){return typeof n==="number"&&Number.isFinite(n)}

function assert(ok,msg){if(!ok)throw Error(msg)}

export function actualTargetQuantity(s){return s.assets.filter(a=>a.kind===s.target.kind&&a.symbol===s.target.symbol).reduce((sum,a)=>sum+a.quantity,0)}

export function validateHistory(rows){assert(Array.isArray(rows)&&rows.length<=366,"성과 이력 형식 오류");let last="";for(const r of rows){assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date>last,"성과 날짜 오류");last=r.date;for(const k of ["quantity","valueUsd","returnPct","targetReturnPct"])assert(r[k]===null||finite(r[k]),"성과 수치 오류");for(const k of ["holdUsd","benchmarkUsd","relativeUsd"])if(r[k]!==undefined)assert(r[k]===null||finite(r[k]),"현금 비교 이력 오류")}return true}

export function validateClosure(s){const c=s.closure;assert(c&&typeof c.endedAt==="string"&&finite(Date.parse(c.endedAt))&&Date.parse(c.endedAt)>=Date.parse(s.startedAt),"종료일 오류");for(const k of ["actualQuantity","estimateQuantity","grossValueUsd","estimatedNetUsd","estimatedDeductionUsd","goal"])assert(finite(c[k])&&c[k]>=0,"종료 수치 오류");assert(finite(c.actualIncreasePct)&&finite(c.actualProgressPct)&&finite(c.returnPct)&&Array.isArray(c.assets),"종료 성과 오류");assert(c.assets.every(a=>a.accountId===s.accountId&&["stock","cash"].includes(a.kind)&&typeof a.symbol==="string"&&finite(a.quantity)&&a.quantity>0),"종료 자산 오류");assert(Math.abs(actualTargetQuantity({...s,assets:c.assets})-c.actualQuantity)<1e-7,"종료 목표자산 불일치");assert(c.plannedQuantity===undefined||c.plannedQuantity===null||finite(c.plannedQuantity)&&c.plannedQuantity>=0,'예상 계획 수량 오류');validateHistory(c.history);return true}

// Simulate only the frozen plan's explicit trades against actual starting allocation.
export function plannedTargetQuantity(s){
 if(!s.plan)return null;
 const positions=new Map(),cash={USD:0,KRW:0};
 for(const a of s.openingAssets){if(a.kind==='stock')positions.set(a.symbol,(positions.get(a.symbol)||0)+a.quantity);else cash[a.symbol]+=a.quantity}
 for(const t of s.plan.trades){const sign=t.side==='buy'?1:-1,amount=t.quantity*t.price+sign*t.fee,next=(positions.get(t.ticker)||0)+sign*t.quantity;cash.USD-=sign*amount;if(!Number.isFinite(cash.USD)||cash.USD< -1e-7||next< -1e-7||amount<0)return null;positions.set(t.ticker,Math.max(0,next))}
 return s.target.kind==='stock'?positions.get(s.target.symbol)||0:Math.max(0,cash[s.target.symbol]);
}

export function closeStrategy(s,result,{endedAt,history=[],estimatedDeductionUsd=0}={}){assert(s.status==="active"&&Array.isArray(s.assets),"운용 중 전략만 종료 가능");const actual=actualTargetQuantity(s),base=s.baseline.quantity;assert(result.goal>base,"목표 기준 오류");const closure={endedAt,plannedQuantity:plannedTargetQuantity(s),actualQuantity:actual,estimateQuantity:result.quantity,grossValueUsd:result.valueUsd,estimatedNetUsd:result.netValueUsd,estimatedDeductionUsd,goal:result.goal,actualIncreasePct:(actual/base-1)*100,actualProgressPct:(actual-base)/(result.goal-base)*100,returnPct:result.returnPct,assets:s.assets.map(a=>({...a})),history:history.map(r=>({...r}))};const {assets,...original}=s;const closed={...original,status:"closed",closure};validateClosure(closed);return closed}
