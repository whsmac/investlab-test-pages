import {quotedPrice} from '../market/pilot-visual-performance.mjs';
import {renderVisualPerformance,renderReview,selectedVisualDate,setVisualDate} from './pilot-visual-performance-ui.mjs';
import {indexRows,portfolioHistory,priorObservation,firstLedgerDay} from '../ledger/pilot-portfolio-history.mjs';
import {loadPublishedYahooReview} from '../market/load-published-yahoo-review.mjs';
import {loadPublishedMarketIndices} from '../market/load-published-market-indices.mjs';
export async function loadPortfolioHistoryMarket(){
 const results=await Promise.allSettled([
  loadPublishedYahooReview({origin:location.href}),
  loadPublishedMarketIndices({origin:location.href}),
  (async()=>{const r=await fetch('./data/portfolio-public-history.json',{credentials:'omit',cache:'no-store',redirect:'error'});if(!r.ok)throw Error('ETF·환율 이력 미게시');const p=await r.json();
   if(p.format!=='PILOT_PUBLIC_HISTORY_V1'||p.source!=='Yahoo Finance / Federal Reserve H.10 DEXKOUS'||p.database_writes!==0||!Array.isArray(p.rows)||p.rows.length>12000||p.rows.some(x=>!['BITU','TQQQ','USD','QLD','SOXL','TSLL','PLTR','TSLA','USDKRW'].includes(x.ticker)))throw Error('과거 시세 형식 오류');return p.rows;})()
 ]);
 const rows=[];
 if(results[0].status==='fulfilled')for(const r of results[0].value.observations)if(r.currency==='USD'&&r.price_basis==='unadjusted_close')rows.push({ticker:r.ticker,date:r.trading_date,close:Number(r.close_price)});
 if(results[1].status==='fulfilled')for(const [ticker,rs] of results[1].value)for(const r of rs)rows.push({ticker,...r});
 if(results[2].status==='fulfilled'){
  const extra=results[2].value,keys=new Set(extra.map(r=>r.ticker+'|'+r.date));
  for(let i=rows.length-1;i>=0;i--)if(keys.has(rows[i].ticker+'|'+rows[i].date))rows.splice(i,1);
  for(const r of extra){
   if(r.as_traded_close!==undefined&&(!Number.isFinite(r.as_traded_close)||r.as_traded_close<=0||!Number.isFinite(r.split_factor)||r.split_factor<=0||Math.abs(r.as_traded_close-r.close*r.split_factor)>Math.max(1e-7,r.as_traded_close*1e-8)))throw Error('분할 기준 오류');
   rows.push(r);
  }
 }
 return indexRows(rows);
}
const $=id=>document.getElementById(id),num=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:d}):'—';
const colors=['#80b6ff','#61d7a8','#e9b66e','#b5a0f6','#f38b9e','#7bd4e9','#c1cbd9'];
const svg=(tag,attrs={},text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;};
function lineChart(id,rows,series,markers=[],selected=null){
 const root=$(id);root.replaceChildren();
 const vals=[...rows.flatMap(r=>series.map(s=>r[s.key])),...markers.map(m=>m.price)].filter(Number.isFinite);
 if(!vals.length){root.textContent='조회 가능한 자료 없음';return;}
 const lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo||Math.max(Math.abs(hi)*0.05,1);
 const width=700,height=230,l=90,r=20,t=12,b=36;
 const x=i=>l+(rows.length===1?0:(width-l-r)*i/(rows.length-1)),y=v=>height-b-(v-lo)/span*(height-t-b);
 const g=svg('svg',{viewBox:'0 0 700 230',role:'img','aria-label':root.dataset.title||'추세 그래프'});g.style.cssText='width:100%;height:auto;min-height:150px;display:block';
 for(let k=0;k<=4;k++){const v=lo+span*k/4,yy=y(v);g.append(svg('line',{x1:l,y1:yy,x2:width-r,y2:yy,stroke:'#34415b'}),svg('text',{x:l-5,y:yy+4,'text-anchor':'end',fill:'#c1cddd','font-size':12},num(v,1)));}
 for(const i of [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])])g.append(svg('text',{x:x(i),y:height-10,'text-anchor':i===0?'start':i===rows.length-1?'end':'middle',fill:'#c1cddd','font-size':12},rows[i].date));
 series.forEach((s,j)=>{let d='',active=false;rows.forEach((row,i)=>{const v=row[s.key];if(!Number.isFinite(v)){active=false;return;}d+=(active?'L':'M')+x(i)+' '+y(v)+' ';active=true;if(rows.length===1)g.append(svg('circle',{cx:x(i),cy:y(v),r:3,fill:colors[j%colors.length]}));});g.append(svg('path',{d,fill:'none',stroke:colors[j%colors.length],'stroke-width':2.3}));});
 for(const m of markers){const i=rows.findIndex(r=>r.date===m.date);if(i<0||!Number.isFinite(m.price))continue;const cy=y(m.price);if(cy<t||cy>height-b)continue;const e=svg('circle',{cx:x(i),cy,r:5,fill:m.type==='BUY'?'#61d7a8':'#f38b9e',stroke:'#101827','stroke-width':1.5});e.append(svg('title',{},m.date+' '+m.type+' '+m.qty+'주 · '+num(m.price,2)));g.append(e);}
 if(selected){const i=rows.findIndex(r=>r.date===selected);if(i>=0)g.append(svg('line',{x1:x(i),x2:x(i),y1:t,y2:height-b,stroke:'#e3d7ff','stroke-dasharray':'4 4'}));g.style.cursor='crosshair';g.onclick=e=>{const rect=g.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*width;const i=Math.max(0,Math.min(rows.length-1,Math.round((px-l)/(width-l-r)*Math.max(0,rows.length-1))));setVisualDate(rows[i].date);};}
 root.append(g);const legend=document.createElement('p');legend.className='muted';series.forEach((s,j)=>{const span=document.createElement('span');span.style.color=colors[j%colors.length];span.textContent='● '+s.label+'　';legend.append(span);});root.append(legend);
}
export function renderPortfolioHistory(data,market,start,end,selected,currency,priceCurrency=currency){
 const rows=portfolioHistory(data,start,end,market,selected,currency);
 const valid=rows.filter(r=>r.total!==null);
 $('historyStatus').textContent=(firstLedgerDay(data,selected)?'원장 기록 시작 '+firstLedgerDay(data,selected):'원장 기록 없음')+' · 평가 가능 '+valid.length+'/'+rows.length+'일 · 기준일 이전 최신 관측값(최대 7일). '+(valid.length<rows.length?'결측일은 그래프에서 연결하지 않습니다. ':'')+'기록된 원장만 재현합니다.';
 const select=$('historyTradeTicker');
 const drawTicker=()=>{const ticker=select.value;
  lineChart('historyQuantities',rows.map(r=>({date:r.date,qty:r.quantities[ticker]||0})),[{key:'qty',label:ticker+' 보유수량'}],[],selectedVisualDate());
  const points=rows.map(r=>({date:r.date,price:(()=>{return quotedPrice(market,ticker,r.date,priceCurrency);})()}));
  const markers=rows.flatMap(r=>r.trades.filter(t=>t.symbol===ticker).map(t=>({...t,date:r.date,price:quotedPrice(market,t.symbol,r.date,priceCurrency,t.price)})));
  lineChart('historyTradePrices',points,[{key:'price',label:ticker+' 종가 '+priceCurrency}],markers,selectedVisualDate());
  lineChart('historyFx',rows,[{key:'fx',label:'USD/KRW 적용환율'}],[],selectedVisualDate());
 };
 renderVisualPerformance(rows,market,data,currency,()=>drawTicker(),priceCurrency);
 select.onchange=()=>{drawTicker();renderReview();};select.onchange();
 const tradeRoot=$('historyTrades');tradeRoot.replaceChildren();$('historyTradePriceHeader').textContent='체결가 '+priceCurrency;
 for(const r of rows)for(const trade of r.trades){const tr=document.createElement('tr');for(const value of [r.date,trade.symbol,trade.type==='BUY'?'매수':'매도',num(trade.qty,6),num(quotedPrice(market,trade.symbol,r.date,priceCurrency,trade.price),priceCurrency==='USD'?2:0)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}tradeRoot.append(tr);}
 if(!tradeRoot.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='기간 내 매수·매도 기록 없음';tr.append(td);tradeRoot.append(tr);}
}
