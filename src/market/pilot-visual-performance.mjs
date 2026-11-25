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
export function comparisonRows(rows,market,tickers,currency){
 if(!rows.length)return [];
 return rows.map(r=>{
  const item={date:r.date,portfolio:finite(r.index)?r.index-100:null,ndx:finite(r.ndx)?r.ndx-100:null,spx:finite(r.spx)?r.spx-100:null};
  for(const ticker of tickers)item['stock:'+ticker]=priceChange(market,ticker,rows[0].date,r.date,currency);
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
