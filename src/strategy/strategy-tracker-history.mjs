import {strategyExecutionRows,executionBases,originalPricePoint} from './strategy-tracker-comparison-view.mjs';
import {liquidationComparison} from './strategy-tracker-actual-start.mjs';
import {replayDocument} from './strategy-tracker-document.mjs';
import {evaluateStrategy} from './investment-strategy-tracker.mjs';
import {tradeSettlement} from '../ledger/pilot-brokerage-settlement.mjs';
import {priorObservation,validDay} from '../ledger/pilot-portfolio-history.mjs';
const DAY=86400000,ms=d=>Date.parse(d+'T00:00:00Z'),day=n=>new Date(n).toISOString().slice(0,10),positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
function quote(market,ticker,date,start,requiresRaw,actual=false){
 const rows=market.get(ticker)||[],q=priorObservation(rows,date,7);
 if(!q||actual&&q.date<start)return null;
 // Do not calculate across a known unresolved stock split.
 const basis=priorObservation(rows,start,7);
 const span=rows.filter(x=>x.date>start&&x.date<=date);
 if([basis,...span].filter(Boolean).some((x,i,a)=>i>0&&positive(x.split_factor)&&positive(a[i-1].split_factor)&&Math.abs(x.split_factor-a[i-1].split_factor)>1e-10))return null;
 if(requiresRaw&&!positive(q.as_traded_close))return null;
 const p=q.as_traded_close??q.close;return positive(p)?p:null;
}
export function strategyHistory(s,ledger,market,{end=day(Date.now()-DAY),maxDays=366}={}){
 if(s.status==='closed')return s.closure.history.map(r=>({...r}));
 const start=s.startedAt.slice(0,10);
 if(!validDay(start)||!validDay(end)||!Number.isInteger(maxDays)||maxDays<1||maxDays>366)throw Error('성과 조회기간 오류');
 if(end<start)return [];
 const entries=new Map(ledger.entries.map(e=>[e.id,e]));
 // Verify all assigned trades before producing historical values, even if later than end.
 replayDocument({version:1,strategies:[s]},ledger,tradeSettlement,()=>true,new Map());
 const requiresRaw=t=>ledger.entries.some(e=>e.accountId===s.accountId&&e.symbol===t&&e.brokerage);
 const targetPrice=d=>s.target.kind==='stock'?quote(market,s.target.symbol,d,start,requiresRaw(s.target.symbol),!!s.actualOrigin):s.target.symbol==='KRW'?(positive(priorObservation(market.get('USDKRW'),d,7)?.close)?1/priorObservation(market.get('USDKRW'),d,7).close:null):1;
 const bases=s.actualOrigin?executionBases(strategyExecutionRows(s,ledger)):[];
 const targetBase=s.actualOrigin?s.actualOrigin.saleGross/s.actualOrigin.quantity:targetPrice(start),out=[];
 for(let n=Math.max(ms(start),ms(end)-(maxDays-1)*DAY);n<=ms(end);n+=DAY){
  const date=day(n),empty={date,quantity:null,valueUsd:null,returnPct:null,targetReturnPct:null};
  const target=targetPrice(date);if(bases.length){const priceMap=new Map(bases.map(b=>[b.symbol,quote(market,b.symbol,date,start,requiresRaw(b.symbol),true)]));empty.symbolReturns=originalPricePoint(bases,priceMap,date);}if(positive(targetBase)&&positive(target))empty.targetReturnPct=(target/targetBase-1)*100;
  try{
   const partial={...s,allocations:s.allocations.filter(a=>entries.get(a.entryId)?.date<=date)};
   const p=replayDocument({version:1,strategies:[partial]},ledger,tradeSettlement,()=>true,new Map())[0];
   const q=new Map(),tickers=new Set(p.assets.filter(a=>a.kind==='stock').map(a=>a.symbol));if(s.target.kind==='stock')tickers.add(s.target.symbol);
   for(const t of tickers){const price=quote(market,t,date,start,requiresRaw(t),!!s.actualOrigin);if(positive(price))q.set(t,{price});}
   const fx=priorObservation(market.get('USDKRW'),date,7)?.close??null;
   const r=evaluateStrategy(p,q,fx);const c=liquidationComparison(s,r,target);out.push({...empty,quantity:r.quantity,valueUsd:r.valueUsd,returnPct:r.returnPct,...(c?{holdUsd:c.holdUsd,benchmarkUsd:c.benchmarkUsd,relativeUsd:c.relativeUsd}: {})});
  }catch{out.push(empty)}
 }
 return out;
}
