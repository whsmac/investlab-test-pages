import {tradeSettlement,tradeExecutionPrice} from '../ledger/pilot-brokerage-settlement.mjs';
const fail=m=>{throw Error(m)},finite=n=>typeof n==='number'&&Number.isFinite(n),money=n=>Math.round(n*100)/100;
const trade=e=>['BUY','SELL'].includes(e.type)&&e.currency==='USD';
export function deriveActualOpening(ledger,accountId,date,entryIds,{allowLater=false}={}){
 if(!ledger.accounts.some(a=>a.id===accountId)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(entryIds)||entryIds.length<2||entryIds.length>100||new Set(entryIds).size!==entryIds.length)fail('실제 거래 선택 오류');
 const rows=ledger.entries.filter(e=>e.accountId===accountId),entries=entryIds.map(id=>rows.find(e=>e.id===id));
 if(entries.some(e=>!e||!trade(e)||e.date!==date||!finite(Number(e.qty))||Number(e.qty)<=0))fail('동일 계좌·거래일의 USD 매수/매도만 선택하세요.');
 if(!allowLater&&rows.some(e=>e.date>date))fail('이 거래일 이후 기록이 있습니다. 현재 버전은 해당 계좌의 최근 거래일만 자동 등록합니다.');
 const sells=entries.filter(e=>e.type==='SELL'),buys=entries.filter(e=>e.type==='BUY');
 if(!sells.length||!buys.length||new Set(sells.map(e=>e.symbol)).size!==1)fail('기준 종목 한 종류의 매도와 전환 매수를 선택하세요.');
 const symbol=sells[0].symbol;if(buys.some(e=>e.symbol===symbol))fail('초기 매수에 기준 종목 재매수가 포함되어 있습니다. 수동 등록을 사용하세요.');
 const sum=(es,f)=>es.reduce((n,e)=>{const v=f(e);if(!finite(v)||v<=0)fail('거래 정산금액 또는 체결가 오류');return n+v},0);
 const saleNet=money(sum(sells,tradeSettlement)),buyCost=money(sum(buys,tradeSettlement)),quantity=sum(sells,e=>Number(e.qty)),saleGross=money(sum(sells,e=>Number(e.qty)*tradeExecutionPrice(e)));
 const extraCash=money(Math.max(0,buyCost-saleNet)),remainingCash=money(Math.max(0,saleNet-buyCost));
 const grouped=new Map();for(const e of buys)grouped.set(e.symbol,(grouped.get(e.symbol)||0)+Number(e.qty));
 const assets=[...grouped].map(([symbol,quantity])=>({accountId,kind:'stock',symbol,quantity}));if(remainingCash>0)assets.push({accountId,kind:'cash',symbol:'USD',quantity:remainingCash});
 return {target:{kind:'stock',symbol},baseline:{quantity,valueUsd:money(saleNet+extraCash)},assets,origin:{date,entryIds:[...entryIds].sort(),symbol,quantity,saleNet,saleGross,buyCost,extraCash,remainingCash}};
}
export function validateActualOrigin(s){
 const o=s.actualOrigin;if(!o)return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(o.date)||o.date!==s.startedAt.slice(0,10)||!Array.isArray(o.entryIds)||o.entryIds.length<2||o.entryIds.length>100||new Set(o.entryIds).size!==o.entryIds.length||o.entryIds.some(id=>typeof id!=='string'||!s.existingEntryIds.includes(id))||o.symbol!==s.target.symbol||s.target.kind!=='stock'||o.quantity!==s.baseline.quantity||!['saleNet','saleGross','buyCost','extraCash','remainingCash'].every(k=>finite(o[k])&&o[k]>=0)||Math.abs(o.saleNet+o.extraCash-s.baseline.valueUsd)>0.005||Math.abs(o.saleNet+o.extraCash-o.buyCost-o.remainingCash)>0.005)fail('실제 시작 거래 기준 오류');
 return true;
}
export function verifyActualOpening(s,ledger){
 if(!s.actualOrigin)return true;
 validateActualOrigin(s);
 const expected=deriveActualOpening(ledger,s.accountId,s.actualOrigin.date,s.actualOrigin.entryIds,{allowLater:true});
 const norm=x=>JSON.stringify(x.map(a=>[a.accountId,a.kind,a.symbol,a.quantity]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
 if(Object.keys(expected.origin).some(k=>JSON.stringify(expected.origin[k])!==JSON.stringify(s.actualOrigin[k]))||norm(expected.assets)!==norm(s.openingAssets))fail('최초 실제 거래 또는 배정 기준 불일치');
 return true;
}
export function actualDecision(s,r,quotes,fx){
 const price=s.target.kind==='stock'?quotes.get(s.target.symbol)?.price:s.target.symbol==='KRW'?1/fx:1;
 if(!finite(price)||price<=0)fail('목표 가격 미확인');
 const comparison=liquidationComparison(s,r,price),benchmark=comparison?.benchmarkUsd??null;
 return {comparison,cashUsd:r.netValueUsd,cashKrw:finite(fx)&&fx>0?r.netValueUsd*fx:null,actualTarget:r.retained,estimatedTarget:r.quantity,goalGapUsd:Math.max(0,r.goal*price-r.netValueUsd),maxTargetPrice:s.target.kind==='stock'?r.retained>=r.goal?null:(r.netValueUsd-r.retained*price)/(r.goal-r.retained):null,benchmarkUsd:benchmark,relativeUsd:benchmark===null?null:r.valueUsd-benchmark,relativePct:benchmark>0?(r.valueUsd/benchmark-1)*100:null};
}

 // Gross, like-for-like liquidation comparison. Additional starting funds are
 // included on the passive side; future costs are not assumed equal.
export function liquidationComparison(s,r,targetPrice){
 const o=s?.actualOrigin;
 if(!o||!finite(targetPrice)||targetPrice<=0||!finite(r?.valueUsd)||r.valueUsd<0)return null;
 if(!finite(r.netFundingUsd)||Math.abs(r.netFundingUsd)>1e-8)return null;
 const holdUsd=o.quantity*targetPrice,convertedUsd=r.valueUsd,extraCash=o.extraCash,benchmarkUsd=holdUsd+extraCash;
 return {holdUsd,convertedUsd,extraCash,rawDifferenceUsd:convertedUsd-holdUsd,benchmarkUsd,relativeUsd:convertedUsd-benchmarkUsd,relativePct:benchmarkUsd>0?(convertedUsd/benchmarkUsd-1)*100:null};
}

// An actual conversion must never be valued using a quote from before its
// recorded execution day. With day-only brokerage records, intraday ordering
// within that day cannot be proven; the displayed quote timestamp remains visible.
export function assertActualStrategyQuoteDates(s,quotes){
 if(!s.actualOrigin)return true;
 const required=new Set([s.target.symbol,...s.assets.filter(a=>a.kind==='stock'&&a.quantity>0).map(a=>a.symbol)]);
 const invalid=[...required].filter(t=>{const q=quotes.get(t);return !q||typeof q.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(q.date)||q.date<s.actualOrigin.date});
 if(invalid.length)throw Error('전략 시작일 '+s.actualOrigin.date+' 이후 시세 미확인: '+invalid.join(', ')+' · 이전 종가로 성과를 계산하지 않습니다.');
 return true;
}
