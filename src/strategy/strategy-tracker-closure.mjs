// Frozen closure records distinguish actual held target from hypothetical conversion.
function finite(n){return typeof n==="number"&&Number.isFinite(n)}

function assert(ok,msg){if(!ok)throw Error(msg)}

export function actualTargetQuantity(s){return s.assets.filter(a=>a.kind===s.target.kind&&a.symbol===s.target.symbol).reduce((sum,a)=>sum+a.quantity,0)}

export function validateHistory(rows){assert(Array.isArray(rows)&&rows.length<=366,"성과 이력 형식 오류");let last="";for(const r of rows){assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date>last,"성과 날짜 오류");last=r.date;for(const k of ["quantity","valueUsd","returnPct","targetReturnPct"])assert(r[k]===null||finite(r[k]),"성과 수치 오류")}return true}

export function validateClosure(s){const c=s.closure;assert(c&&typeof c.endedAt==="string"&&finite(Date.parse(c.endedAt))&&Date.parse(c.endedAt)>=Date.parse(s.startedAt),"종료일 오류");for(const k of ["actualQuantity","estimateQuantity","grossValueUsd","estimatedNetUsd","estimatedDeductionUsd","goal"])assert(finite(c[k])&&c[k]>=0,"종료 수치 오류");assert(finite(c.actualIncreasePct)&&finite(c.actualProgressPct)&&finite(c.returnPct)&&Array.isArray(c.assets),"종료 성과 오류");assert(c.assets.every(a=>a.accountId===s.accountId&&["stock","cash"].includes(a.kind)&&typeof a.symbol==="string"&&finite(a.quantity)&&a.quantity>0),"종료 자산 오류");assert(Math.abs(actualTargetQuantity({...s,assets:c.assets})-c.actualQuantity)<1e-7,"종료 목표자산 불일치");validateHistory(c.history);return true}

export function closeStrategy(s,result,{endedAt,history=[],estimatedDeductionUsd=0}={}){assert(s.status==="active"&&Array.isArray(s.assets),"운용 중 전략만 종료 가능");const actual=actualTargetQuantity(s),base=s.baseline.quantity;assert(result.goal>base,"목표 기준 오류");const closure={endedAt,actualQuantity:actual,estimateQuantity:result.quantity,grossValueUsd:result.valueUsd,estimatedNetUsd:result.netValueUsd,estimatedDeductionUsd,goal:result.goal,actualIncreasePct:(actual/base-1)*100,actualProgressPct:(actual-base)/(result.goal-base)*100,returnPct:result.returnPct,assets:s.assets.map(a=>({...a})),history:history.map(r=>({...r}))};const {assets,...original}=s;const closed={...original,status:"closed",closure};validateClosure(closed);return closed}
