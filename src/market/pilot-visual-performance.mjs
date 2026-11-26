import {priorObservation} from '../ledger/pilot-portfolio-history.mjs';
export const finite=Number.isFinite;
export function sampleTimeline(rows,mode='day'){
 if(mode==='day'||rows.length<3)return rows;
 const groups=new Map();
 for(const row of rows){
  const d=new Date(row.date+'T00:00:00Z');
  if(mode==='week')d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
  const key=mode==='month'?row.date.slice(0,7):d.toISOString().slice(0,10);
  groups.set(key,row);
 }
 const dates=new Set([rows[0].date,...[...groups.values()].map(r=>r.date),rows.at(-1).date]);
 // Keep missing intervals visible; never connect across a gap hidden by sampling.
 for(let i=0;i<rows.length;i++)if(!finite(rows[i].total)||!finite(rows[i].index))if(i===0||finite(rows[i-1].total)&&finite(rows[i-1].index))dates.add(rows[i].date);
 return rows.filter(r=>dates.has(r.date));
}
export function assetKeys(rows){return [...new Set(rows.flatMap(r=>Object.keys(r.components||{})))].sort((a,b)=>a==='현금'?1:b==='현금'?-1:a.localeCompare(b));}
export function composition(row,keys){
 if(!row?.components||!finite(row.total)||row.total<=0||keys.some(k=>(row.components[k]||0)<0))return null;
 const items=keys.map(key=>({key,value:row.components[key]||0})).filter(x=>x.value>0);
 if(Math.abs(items.reduce((a,x)=>a+x.value,0)-row.total)>Math.max(1e-7,row.total*1e-9))return null;
 return items;
}
export function assetRadius(total,max,r=88){return finite(total)&&total>0&&max>0?r*Math.sqrt(total/max):0;}
export function treemap(items,x=0,y=0,w=600,h=260){
 const list=items.filter(a=>finite(a.value)&&a.value>0).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));
 function divide(a,x,y,w,h){
  if(!a.length)return [];
  if(a.length===1)return [{...a[0],x,y,w,h}];
  const sum=a.reduce((s,r)=>s+r.value,0);let split=1,part=a[0].value;
  while(split<a.length-1&&Math.abs(part+a[split].value-sum/2)<Math.abs(part-sum/2)){part+=a[split++].value;}
  const ratio=part/sum;
  return w>=h?[...divide(a.slice(0,split),x,y,w*ratio,h),...divide(a.slice(split),x+w*ratio,y,w*(1-ratio),h)]:[...divide(a.slice(0,split),x,y,w,h*ratio),...divide(a.slice(split),x,y+h*ratio,w,h*(1-ratio))];
 }
 return divide(list,x,y,w,h);
}
export function priceChange(market,ticker,start,end,currency='USD'){
 const a=priorObservation(market.get(ticker),start),b=priorObservation(market.get(ticker),end);
 if(!a||!b)return null;
 let ratio=b.close/a.close;
 if(currency==='KRW'){
  const x=priorObservation(market.get('USDKRW'),start),y=priorObservation(market.get('USDKRW'),end);
  if(!x||!y)return null;ratio*=y.close/x.close;
 }
 return 100*(ratio-1);
}
export function comparisonRows(rows,market,tickers,currency,baseDate=rows.find(r=>finite(r.index))?.date??rows[0]?.date){
 if(!rows.length)return [];
 return rows.map(r=>{
  const item={date:r.date,portfolio:finite(r.index)?r.index-100:null,ndx:finite(r.ndx)?r.ndx-100:null,spx:finite(r.spx)?r.spx-100:null};
  for(const ticker of tickers)item['stock:'+ticker]=baseDate&&r.date>=baseDate?priceChange(market,ticker,baseDate,r.date,currency):null;
  return item;
 });
}
export function reviewTrade(trade,market,asOf){
 if(!trade||!finite(trade.price)||trade.price<=0)return null;
 const obs=priorObservation(market.get(trade.symbol),asOf);
 const entry=priorObservation(market.get(trade.symbol),trade.date);
 const comparable=obs&&entry?obs.close*(entry.split_factor??1):null;
 return obs&&obs.date>=trade.date&&finite(comparable)?{date:obs.date,close:comparable,change:100*(comparable/trade.price-1)}:null;
}

/** Account-scope end-of-day valuation and net external contributions are distinct.
 * A partial period uses the actual first positive, complete valuation, never
 * silently presents a shorter interval as full requested-period performance.
 */
export function periodSummary(rows,selectedDate){
 const base=rows.find(r=>finite(r.total)&&r.total>0&&r.index===100);
 const row=rows.find(r=>r.date===selectedDate);
 const elapsed=rows.filter(r=>r.date<=selectedDate);
 const validDays=elapsed.filter(r=>finite(r.total)).length;
 const canCompare=!!base&&!!row&&row.date>=base.date&&finite(row.total);
 const assetChange=canCompare?row.total-base.total:null;
 const netFlow=canCompare&&finite(row.capital)?row.capital-base.total:null;
 return {baseDate:base?.date??null,selectedDate:row?.date??null,validDays,days:elapsed.length,
  assetChange,netFlow,investmentGain:finite(assetChange)&&finite(netFlow)?assetChange-netFlow:null,
  returnPct:canCompare&&finite(row.index)?row.index-100:null,
  ndxExcess:canCompare&&finite(row.index)&&finite(row.ndx)?row.index-row.ndx:null,
  spxExcess:canCompare&&finite(row.index)&&finite(row.spx)?row.index-row.spx:null,
  missing:row?.missing??[]};
}

/** Period buckets use actual published observations; no weekend/holiday zero returns.
 * First and last buckets may be partial. Baseline is the last close before bucket
 * start, at most seven days old; end must have an observation inside the bucket.
 */
export function defaultHeatMode(rows){return rows.length<=31?'day':rows.length<=93?'week':'month';}
const prevDay=d=>new Date(Date.parse(d+'T00:00:00Z')-86400000).toISOString().slice(0,10);
export function heatPeriods(rows,market,tickers,mode='day'){
 if(!rows.length)return [];
 const start=rows[0].date,end=rows.at(-1).date,groups=new Map();
 const keyOf=d=>{if(mode==='month')return d.slice(0,7);if(mode==='week'){const dt=new Date(d+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()-((dt.getUTCDay()+6)%7));return dt.toISOString().slice(0,10);}return d;};
 for(const r of rows){const key=keyOf(r.date),g=groups.get(key);if(g)g.end=r.date;else groups.set(key,{key,start:r.date,end:r.date});}
 const observations=new Set(tickers.flatMap(t=>(market.get(t)||[]).filter(q=>q.date>=start&&q.date<=end).map(q=>q.date)));
 return [...groups.values()].filter(p=>{if(mode==='day')return observations.has(p.start);for(const d of observations)if(d>=p.start&&d<=p.end)return true;return false;});
}
export function heatReturn(market,ticker,period,currency='USD'){
 const a=priorObservation(market.get(ticker),prevDay(period.start)),b=priorObservation(market.get(ticker),period.end);
 if(!a||!b||b.date<period.start||b.date===a.date)return null;
 let first=a.close,last=b.close;
 if(currency==='KRW'){
  const x=priorObservation(market.get('USDKRW'),a.date),y=priorObservation(market.get('USDKRW'),b.date);
  if(!x||!y)return null;first*=x.close;last*=y.close;
 }
 return {change:100*(last/first-1),startDate:a.date,endDate:b.date,first,last};
}

/** Display currency is independent from the common comparison/valuation currency. */
export function quotedPrice(market,ticker,date,priceCurrency='USD',executionPrice=null){
 const obs=priorObservation(market.get(ticker),date);
 const raw=executionPrice!==null?executionPrice:(obs?.as_traded_close??obs?.close);
 if(!finite(raw)||raw<=0)return null;
 if(priceCurrency==='USD')return raw;
 const fx=priorObservation(market.get('USDKRW'),date);
 return fx&&finite(fx.close)&&fx.close>0?raw*fx.close:null;
}
/** Drawdown from each series' own running high. Missing observations stay null;
 * incomplete history is explicitly reported, not presented as a complete MDD. */
export function drawdownRows(rows){
 const peak={portfolio:null,ndx:null,spx:null};
 return rows.map(r=>{const out={date:r.date};for(const [key,src] of [['portfolio','index'],['ndx','ndx'],['spx','spx']]){
 const v=r[src];if(!finite(v)||v<0||(peak[key]===null&&v===0)){out[key]=null;continue;}
 peak[key]=Math.max(peak[key]??v,v);out[key]=100*(v/peak[key]-1);
 }return out;});
}
export function drawdownSummary(rows,selectedDate,key='portfolio'){
 const elapsed=rows.filter(r=>r.date<=selectedDate),base=elapsed.findIndex(r=>finite(r[key])),valid=elapsed.filter(r=>finite(r[key])),row=elapsed.find(r=>r.date===selectedDate);
 const worst=valid.reduce((a,r)=>!a||r[key]<a[key]?r:a,null),current=finite(row?.[key])?row[key]:null;
 return {current,mdd:worst?.[key]??null,mddDate:worst?.date??null,recovery:current!==null&&current>-100?100*(1/(1+current/100)-1):null,complete:base===0&&valid.length===elapsed.length&&elapsed.length>0,validDays:valid.length,days:elapsed.length};
}
