import {EXTERNAL_IN,EXTERNAL_OUT,tradeExecutionPrice} from './pilot-brokerage-settlement.mjs';
import {projectLedger} from './pilot-portfolio-projection.mjs';
const DAY=86400000;
export const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const ms=d=>Date.parse(d+'T00:00:00Z');
const day=n=>new Date(n).toISOString().slice(0,10);
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function firstLedgerDay(data,account='ALL'){
 return data.entries.filter(e=>account==='ALL'||e.accountId===account).map(e=>e.date).filter(validDay).sort()[0]||null;
}
export function ledgerAsOf(data,date){
 if(!validDay(date))throw Error('기준일 오류');
 return {...data,entries:data.entries.filter(e=>validDay(e.date)&&e.date<=date)};
}
export function indexRows(rows){
 const m=new Map();
 for(const r of rows){
  if(!validDay(r.date)||!positive(r.close)||typeof r.ticker!=='string')throw Error('시세 형식 오류');
  const arr=m.get(r.ticker)||[];arr.push(r);m.set(r.ticker,arr);
 }
 for(const arr of m.values()){arr.sort((a,b)=>a.date.localeCompare(b.date));for(let i=1;i<arr.length;i++)if(arr[i].date===arr[i-1].date)throw Error('중복 시세');}
 return m;
}
export function priorObservation(rows,date,maxDays=7){
 if(!validDay(date)||!rows?.length)return null;
 let lo=0,hi=rows.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].date<=date)lo=mid+1;else hi=mid;}
 const r=rows[lo-1];return r&&ms(date)-ms(r.date)<=maxDays*DAY?r:null;
}
export function historicalSnapshot(data,date,market,account='ALL',currency='KRW'){
 const first=firstLedgerDay(data,account);
 if(!first||date<first)return {date,available:false,reason:'기록 시작일 이전 또는 원장 없음',total:null};
 const ledger=ledgerAsOf(data,date),p=projectLedger(ledger,account),fxObs=priorObservation(market.get('USDKRW'),date),fx=fxObs?.close??null;
 const prices=new Map(),missing=[],components={};
 const convert=(n,cur)=>cur===currency?n:positive(fx)?(cur==='USD'?n*fx:n/fx):n===0?0:null;
 for(const h of p.holdings){const q=priorObservation(market.get(h.symbol),date);
  if(!q){missing.push(h.symbol);continue;}
  const imported=ledger.entries.some(e=>e.brokerage&&e.symbol===h.symbol&&(account==='ALL'||e.accountId===account));
  if(imported&&!positive(q.as_traded_close)){missing.push(h.symbol+' (분할기준 미확인)');continue;}
  // Block unreconciled changes in share basis while a statement position spans a split.
  if(imported){
   const observations=market.get(h.symbol)||[];
   let unresolved=false;
   for(let i=1;i<observations.length;i++){
    const prev=observations[i-1],next=observations[i];
    if(next.date>date)break;
    if(!positive(prev.split_factor)||!positive(next.split_factor)||Math.abs(prev.split_factor-next.split_factor)<1e-10)continue;
    const before=projectLedger(ledgerAsOf(ledger,day(ms(next.date)-DAY)),account);
    if(before.holdings.some(p=>p.symbol===h.symbol&&p.qty>0)){unresolved=true;break;}
   }
   if(unresolved){missing.push(h.symbol+' (보유 중 분할 검산 필요)');continue;}
  }
  const close=q.as_traded_close??q.close;
  prices.set(h.symbol,{...q,close,currency:'USD',kind:'historical_close'});
  const v=convert(h.qty*close,'USD');if(v!==null)components[h.symbol]=v;else if(!missing.includes('환율'))missing.push('환율');
 }
 const a=convert(p.cash.USD,'USD'),b=convert(p.cash.KRW,'KRW');
 if(a===null||b===null){if(!missing.includes('환율'))missing.push('환율');}else components['현금']=a+b;
 const total=missing.length?null:Object.values(components).reduce((s,v)=>s+v,0);
 return {date,available:true,ledger,prices,fx,fxDate:fxObs?.date||'',missing,total,components,holdings:p.holdings,cash:p.cash};
}
export function portfolioHistory(data,start,end,market,account='ALL',currency='KRW'){
 if(!validDay(start)||!validDay(end)||start>end||ms(end)-ms(start)>1830*DAY)throw Error('조회 기간은 최대 5년입니다.');
 const first=firstLedgerDay(data,account);if(!first||end<first)return [];
 start=start<first?first:start;
 const relevant=data.entries.filter(e=>account==='ALL'||e.accountId===account),byDate=new Map();
 for(const e of relevant){const a=byDate.get(e.date)||[];a.push(e);byDate.set(e.date,a);}
 let previous=null,index=null,peak=null,base=null,cumulative=0,capitalKnown=true;
 const result=[];
 for(let n=ms(start);n<=ms(end);n+=DAY){
  const date=day(n),s=historicalSnapshot(data,date,market,account,currency);
  let flow=0,flowKnown=true;
  for(const e of byDate.get(date)||[]){
   if(![...EXTERNAL_IN,...EXTERNAL_OUT].includes(e.type))continue;
   const amount=e.type==='OPEN'?e.qty*e.price:e.amount,cur=e.type==='OPEN'?'USD':e.currency;
   const v=cur===currency?amount:positive(s.fx)?(cur==='USD'?amount*s.fx:amount/s.fx):null;
   if(v===null)flowKnown=false;else flow+=(EXTERNAL_OUT.includes(e.type)?-1:1)*v;
  }
  if(!flowKnown)capitalKnown=false;
  cumulative+=flow;
  if(base===null&&s.total!==null&&s.total>0){base=s.total;index=100;peak=100;cumulative=0;capitalKnown=true;}
  else if(base!==null){
   // End-of-day external-flow convention; do not bridge missing dates.
   if(index!==null&&previous?.total>0&&s.total!==null&&flowKnown&&s.total-flow>=0)index*=((s.total-flow)/previous.total);
   else index=null;
  }
  if(index!==null)peak=Math.max(peak,index);
  const ndx=priorObservation(market.get('NDX'),date),spx=priorObservation(market.get('SPX'),date);
  result.push({date,total:s.total,components:s.total===null?null:s.components,quantities:Object.fromEntries(s.holdings.map(h=>[h.symbol,h.qty])),fx:s.fx,flow:flowKnown?flow:null,capital:base!==null&&capitalKnown?base+cumulative:null,index,mdd:index!==null&&peak>0?100*(index/peak-1):null,ndx:ndx&&(currency==='USD'||positive(s.fx))?ndx.close*(currency==='KRW'?s.fx:1):null,spx:spx&&(currency==='USD'||positive(s.fx))?spx.close*(currency==='KRW'?s.fx:1):null,missing:s.missing||[],trades:(byDate.get(date)||[]).filter(e=>['BUY','SELL'].includes(e.type)).map(e=>({symbol:e.symbol,type:e.type,qty:e.qty,price:tradeExecutionPrice(e)}))});
  previous=s;
 }
 const baseRow=result.find(r=>r.index===100),benchmarkBase=baseRow?{ndx:baseRow.ndx,spx:baseRow.spx}:{};
 for(const r of result){for(const name of ['ndx','spx'])r[name]=benchmarkBase[name]>0&&r.date>=baseRow.date&&r[name]!==null?r[name]/benchmarkBase[name]*100:null;}
 return result;
}
