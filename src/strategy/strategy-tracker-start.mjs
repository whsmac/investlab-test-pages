import {createStrategy,replayDocument} from './strategy-tracker-document.mjs';
import {validateAllocation,evaluateStrategy} from './investment-strategy-tracker.mjs';
import {parseSimulatorPlans,suggestPlanTarget} from './strategy-tracker-plan-import.mjs';
import {tradeSettlement} from '../ledger/pilot-brokerage-settlement.mjs';
export function verifiedPlan(current,serverRows,index=0){
 if(!Array.isArray(current)||!current.length||!Number.isInteger(index)||index<0||index>=current.length)throw Error('운용할 가상전략을 선택하세요.');
 const group=current[0].name;
 const row=serverRows.find(r=>r.name===group);
 if(!row)throw Error('현재 전략을 먼저 서버에 저장하세요.');
 // Compare full saved scenario (including forecast prices), not just trade rows.
 const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
 if(JSON.stringify(normalize(row.strategies))!==JSON.stringify(normalize(current)))throw Error('현재 편집 내용이 서버 저장본과 다릅니다. 전략 저장 후 다시 시도하세요.');
 return parseSimulatorPlans([row])[index];
}
export function openingValue(assets,quotes,fx){
 let total=0;
 for(const a of assets){if(!Number.isFinite(a.quantity)||a.quantity<=0)throw Error('배정량 오류');if(a.kind==='stock'){const q=quotes.get(a.symbol);if(!Number.isFinite(q)||q<=0)throw Error(a.symbol+' 유효 시세 미확인');total+=a.quantity*q;}else if(a.kind==='cash'&&a.symbol==='USD')total+=a.quantity;else if(a.kind==='cash'&&a.symbol==='KRW'&&Number.isFinite(fx)&&fx>0)total+=a.quantity/fx;else throw Error('현금 환율 미확인');}
 return total;
}
export function startTrackedStrategy({doc,ledger,accounts,plan,accountId,target,baseline,assets,id,startedAt}){
 if(doc.strategies.some(s=>s.status==='active'&&s.accountId===accountId&&s.plan?.group===plan.group&&s.plan?.name===plan.name))throw Error('같은 계좌에서 이미 운용 중인 전략입니다. 추적 화면에서 확인하세요.');
 const s=createStrategy({id,name:plan.name,accountId,target,baseline,assets,ledger,startedAt,plan});
 const next={version:1,strategies:[...doc.strategies,s]};
 replayDocument(next,ledger,tradeSettlement,validateAllocation,accounts);
 return next;
}
