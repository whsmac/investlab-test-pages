import {indexRows,portfolioHistory,priorObservation,firstLedgerDay} from '../ledger/pilot-portfolio-history.mjs';
import {loadPublishedYahooReview} from '../market/load-published-yahoo-review.mjs';
import {loadPublishedMarketIndices} from '../market/load-published-market-indices.mjs';
export async function loadPortfolioHistoryMarket(){
 const results=await Promise.allSettled([
  loadPublishedYahooReview({origin:location.href}),
  loadPublishedMarketIndices({origin:location.href}),
  (async()=>{const r=await fetch('./data/portfolio-public-history.json',{credentials:'omit',cache:'no-store',redirect:'error'});if(!r.ok)throw Error('ETF·환율 이력 미게시');const p=await r.json();
   if(p.format!=='PILOT_PUBLIC_HISTORY_V1'||p.source!=='Yahoo Finance / Federal Reserve H.10 DEXKOUS'||p.database_writes!==0||!Array.isArray(p.rows)||p.rows.length>8000||p.rows.some(x=>!['BITU','TQQQ','USD','USDKRW'].includes(x.ticker)))throw Error('과거 시세 형식 오류');return p.rows;})()
 ]);
 const rows=[];
 if(results[0].status==='fulfilled')for(const r of results[0].value.observations)if(r.currency==='USD'&&r.price_basis==='unadjusted_close')rows.push({ticker:r.ticker,date:r.trading_date,close:Number(r.close_price)});
 if(results[1].status==='fulfilled')for(const [ticker,rs] of results[1].value)for(const r of rs)rows.push({ticker,...r});
 if(results[2].status==='fulfilled')rows.push(...results[2].value);
 return indexRows(rows);
}
const $=id=>document.getElementById(id),num=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:d}):'—';
const colors=['#80b6ff','#61d7a8','#e9b66e','#b5a0f6','#f38b9e','#7bd4e9','#c1cbd9'];
const svg=(tag,attrs={},text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;};
function lineChart(id,rows,series){
 const root=$(id);root.replaceChildren();
 const vals=rows.flatMap(r=>series.map(s=>r[s.key])).filter(Number.isFinite);
 if(!vals.length){root.textContent='조회 가능한 자료 없음';return;}
 const lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo||Math.max(Math.abs(hi)*0.05,1);
 const width=700,height=230,l=90,r=20,t=12,b=36;
 const x=i=>l+(rows.length===1?0:(width-l-r)*i/(rows.length-1)),y=v=>height-b-(v-lo)/span*(height-t-b);
 const g=svg('svg',{viewBox:'0 0 700 230',role:'img','aria-label':root.dataset.title||'추세 그래프'});g.style.cssText='width:100%;height:auto;min-height:150px;display:block';
 for(let k=0;k<=4;k++){const v=lo+span*k/4,yy=y(v);g.append(svg('line',{x1:l,y1:yy,x2:width-r,y2:yy,stroke:'#34415b'}),svg('text',{x:l-5,y:yy+4,'text-anchor':'end',fill:'#c1cddd','font-size':12},num(v,1)));}
 for(const i of [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])])g.append(svg('text',{x:x(i),y:height-10,'text-anchor':i===0?'start':i===rows.length-1?'end':'middle',fill:'#c1cddd','font-size':12},rows[i].date));
 series.forEach((s,j)=>{let d='',active=false;rows.forEach((row,i)=>{const v=row[s.key];if(!Number.isFinite(v)){active=false;return;}d+=(active?'L':'M')+x(i)+' '+y(v)+' ';active=true;if(rows.length===1)g.append(svg('circle',{cx:x(i),cy:y(v),r:3,fill:colors[j%colors.length]}));});g.append(svg('path',{d,fill:'none',stroke:colors[j%colors.length],'stroke-width':2.3}));});
 root.append(g);const legend=document.createElement('p');legend.className='muted';series.forEach((s,j)=>{const span=document.createElement('span');span.style.color=colors[j%colors.length];span.textContent='● '+s.label+'　';legend.append(span);});root.append(legend);
}
function weights(rows){
 const root=$('historyWeights');root.replaceChildren();
 const available=rows.filter(r=>r.components&&r.total>0);
 if(!available.length){root.textContent='자산 구성비 계산 자료 없음';return;}
 const selected=available.filter((_,i)=>i===0||i===available.length-1||i%Math.max(1,Math.ceil(available.length/10))===0);
 const tickers=[...new Set(available.flatMap(r=>Object.keys(r.components)))].sort();
 const legend=document.createElement('p');legend.className='muted';tickers.forEach((t,i)=>{const e=document.createElement('span');e.style.color=colors[i%colors.length];e.textContent='● '+t+'　';legend.append(e);});root.append(legend);
 for(const row of selected){const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:8px;align-items:center;margin:8px 0';const label=document.createElement('span');label.style.cssText='font-size:12px;min-width:82px';label.textContent=row.date;const bar=document.createElement('div');bar.style.cssText='display:flex;flex:1;height:18px;overflow:hidden;border-radius:5px;background:#27334b';tickers.forEach((t,i)=>{const val=row.components[t]||0;if(val<=0)return;const e=document.createElement('span');e.style.cssText='background:'+colors[i%colors.length]+';width:'+100*val/row.total+'%';e.title=t+' '+num(100*val/row.total,1)+'%';bar.append(e);});wrap.append(label,bar);root.append(wrap);}
}
export function renderPortfolioHistory(data,market,start,end,selected,currency){
 const rows=portfolioHistory(data,start,end,market,selected,currency);
 const valid=rows.filter(r=>r.total!==null);
 $('historyStatus').textContent=(firstLedgerDay(data,selected)?'원장 기록 시작 '+firstLedgerDay(data,selected):'원장 기록 없음')+' · 평가 가능 '+valid.length+'/'+rows.length+'일 · 기준일 이전 최신 관측값(최대 7일). '+(valid.length<rows.length?'결측일은 그래프에서 연결하지 않습니다. ':'')+'기록된 원장만 재현합니다.';
 lineChart('historyAssets',rows,[{key:'total',label:'총자산 '+currency},{key:'capital',label:'기간 시작 평가액 + 순외부유입'}]);
 lineChart('historyPerformance',rows,[{key:'index',label:'내 자산 (입출금 조정, 시작 100)'},{key:'ndx',label:'NASDAQ 100'},{key:'spx',label:'S&P 500'}]);
 lineChart('historyDrawdown',rows,[{key:'mdd',label:'고점 대비 하락률 %'}]);
 weights(rows);
 const tradeRoot=$('historyTrades');tradeRoot.replaceChildren();
 for(const r of rows)for(const trade of r.trades){const tr=document.createElement('tr');for(const value of [r.date,trade.symbol,trade.type==='BUY'?'매수':'매도',num(trade.qty,6),num(trade.price,2)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}tradeRoot.append(tr);}
 if(!tradeRoot.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='기간 내 매수·매도 기록 없음';tr.append(td);tradeRoot.append(tr);}
}
