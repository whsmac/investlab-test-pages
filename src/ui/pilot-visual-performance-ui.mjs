import {assetKeys,composition,assetRadius,treemap,priceChange,sampleTimeline,comparisonRows,reviewTrade,finite,periodSummary,defaultHeatMode,heatPeriods,heatReturn} from '../market/pilot-visual-performance.mjs';
import {priorObservation} from '../ledger/pilot-portfolio-history.mjs';
import {createTickerChartButton} from './pilot-tradingview-chart.mjs';
const $=id=>document.getElementById(id);
const fmt=(v,d=0)=>finite(v)?v.toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=v=>finite(v)?(v>0?'+':'')+fmt(v,2)+'%':'—';
const money=(v,c)=>finite(v)?c+' '+fmt(v):'—';
const pal=['#9378f7','#5a9af7','#39c5ba','#edac62','#df81c2','#9ccf70','#83cddd','#d0a1f5','#ef9391'];
const svg=(tag,attrs={},text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const colorReturn=v=>!finite(v)?'#33445a':v>0?'#12694f':v<0?'#87394b':'#34445c';
let active=null,playTimer=null;
export function stopVisualPlayback(){clearInterval(playTimer);playTimer=null;if($('visualPlay'))$('visualPlay').textContent='▶ 재생';}
export function clearVisualPerformance(){stopVisualPlayback();active=null;for(const id of ['visualPeriodSummary','visualHero','historyAssets','visualTreemap','visualTreemapDetail','visualSelection','visualComparePicks','historyPerformance','visualReview','visualMarketHeat','visualHeatDetail','visualHeatPage'])$(id)?.replaceChildren();if($('visualHoldingDetails'))$('visualHoldingDetails').open=false;if($('visualDay'))$('visualDay').textContent='—';if($('visualSlider')){$('visualSlider').max='0';$('visualSlider').value='0';$('visualSlider').disabled=true;}}
function legend(root,items){const l=el('div',undefined,'visual-legend');for(const item of items){const s=el('span');const dot=el('i');dot.style.background=item.color;s.append(dot,document.createTextNode(item.label));l.append(s);}root.append(l);}
function plot(root,rows,series,{stack=false,percent=false,selected,keys=[],pick,markers=[]}={}){
 root.replaceChildren();
 if(!rows.length){root.textContent='조회 가능한 자료 없음';return;}
 const values=stack?rows.flatMap(r=>{const c=composition(r,keys);return c?[percent?100:r.total]:[];}):rows.flatMap(r=>series.map(s=>r[s.key])).filter(finite);
 if(!values.length){root.textContent='조회 가능한 자료 없음';return;}
 const min=stack?0:Math.min(0,...values),max=percent?100:Math.max(...values,stack?0:1),span=max-min||1;
 const W=760,H=265,L=85,R=24,T=16,B=38;
 const start=Date.parse(rows[0].date),end=Date.parse(rows.at(-1).date);
 const x=d=>L+(W-L-R)*(end===start?.5:(Date.parse(d)-start)/(end-start));
 const y=v=>H-B-(H-T-B)*(v-min)/span;
 const g=svg('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':root.dataset.title||'기간 변화 그래프'});g.classList.add('visual-svg');
 for(let i=0;i<5;i++){const v=min+span*i/4,yy=y(v);g.append(svg('line',{x1:L,x2:W-R,y1:yy,y2:yy,stroke:'#35435b','stroke-dasharray':'3 4'}),svg('text',{x:L-7,y:yy+4,'text-anchor':'end',fill:'#bac9df','font-size':12},percent?fmt(v)+'%':Math.abs(v)>=1000000?fmt(v/1000000,1)+'M':fmt(v,Math.abs(v)<100?1:0)));}
 const ticks=[...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])];
 for(const i of ticks)g.append(svg('text',{x:x(rows[i].date),y:H-11,'text-anchor':i===0?'start':i===rows.length-1?'end':'middle',fill:'#b9c7df','font-size':12},rows[i].date));
 if(stack){
  const segments=[];let seg=[];
  for(const r of rows){if(composition(r,keys))seg.push(r);else if(seg.length){segments.push(seg);seg=[];}}if(seg.length)segments.push(seg);
  for(const run of segments){for(let j=0;j<keys.length;j++){
   const upper=[],lower=[];
   for(const r of run){const scale=percent?100/r.total:1,lo=keys.slice(0,j).reduce((s,k)=>s+(r.components[k]||0),0)*scale,hi=lo+(r.components[keys[j]]||0)*scale;upper.push([x(r.date),y(hi)]);lower.push([x(r.date),y(lo)]);}
   if(run.length===1){const [xx,yy]=upper[0];g.append(svg('rect',{x:xx-4,y:yy,width:8,height:Math.max(0,lower[0][1]-yy),fill:series[j].color}));}
   else g.append(svg('polygon',{points:[...upper,...lower.reverse()].map(p=>p.join(',')).join(' '),fill:series[j].color,opacity:.83}));
  }}
  if(!percent)for(const run of segments){g.append(svg('path',{d:run.map((r,i)=>(i?'L':'M')+x(r.date)+' '+y(r.total)).join(' '),fill:'none',stroke:'#e9e5ff','stroke-width':2.5}));}
 }else for(const s of series){let path='',open=false;const valid=rows.filter(r=>finite(r[s.key]));
  for(const r of rows){if(!finite(r[s.key])){open=false;continue;}path+=(open?'L':'M')+x(r.date)+' '+y(r[s.key])+' ';open=true;}
  g.append(svg('path',{d:path,fill:'none',stroke:s.color,'stroke-width':s.key==='portfolio'?3:2,'stroke-dasharray':s.dash||''}));
  if(valid.length===1)g.append(svg('circle',{cx:x(valid[0].date),cy:y(valid[0][s.key]),r:3.5,fill:s.color}));
 }
 for(const m of markers){if(m.date<rows[0].date||m.date>rows.at(-1).date||!finite(m.value))continue;const dot=svg('circle',{cx:x(m.date),cy:y(m.value),r:4.5,fill:m.type==='BUY'?'#6ee7b7':'#ff8eaa',stroke:'#121b2d','stroke-width':1.5});dot.append(svg('title',{},m.date+' '+m.symbol+' '+(m.type==='BUY'?'매수':'매도')));g.append(dot);}
 if(selected&&selected>=rows[0].date&&selected<=rows.at(-1).date)g.append(svg('line',{x1:x(selected),x2:x(selected),y1:T,y2:H-B,stroke:'#f2eaff','stroke-width':1.5,'stroke-dasharray':'4 4',class:'visual-cursor'}));
 if(pick){g.style.cursor='crosshair';g.onclick=e=>{const r=g.getBoundingClientRect(),pos=(e.clientX-r.left)/r.width*W,ratio=Math.max(0,Math.min(1,(pos-L)/(W-L-R))),target=start+ratio*(end-start);let best=rows[0];for(const row of rows)if(Math.abs(Date.parse(row.date)-target)<Math.abs(Date.parse(best.date)-target))best=row;pick(best.date);};}
 root.append(g);legend(root,series.map(s=>({label:s.label,color:s.color})));
}
function donut(row,keys,colors,max,currency,label){
 const box=el('div',undefined,'visual-donut');box.append(el('strong',label),el('small',row?.date||'—'));
 const g=svg('svg',{viewBox:'0 0 200 200','aria-label':label+' 자산 구성'}),items=composition(row,keys),r=assetRadius(row?.total,max);
 if(items&&r>0){let offset=0;const radius=r*.75,c=2*Math.PI*radius;for(const item of items){const part=item.value/row.total;const ring=svg('circle',{cx:100,cy:100,r:radius,fill:'none',stroke:colors[item.key],'stroke-width':r*.5,'stroke-dasharray':c*part+' '+c*(1-part),'stroke-dashoffset':-c*offset,transform:'rotate(-90 100 100)'});ring.append(svg('title',{},item.key+' '+fmt(part*100,1)+'% · '+money(item.value,currency)));g.append(ring);offset+=part;}}
 else g.append(svg('text',{x:100,y:103,'text-anchor':'middle',fill:'#b9c7df','font-size':13},'자료 없음'));
 box.append(g,el('b',money(row?.total,currency)));return box;
}
export function selectedVisualDate(){return active?.rows[active.index]?.date||null;}
export function setVisualDate(date){stopVisualPlayback();setSelected(date);}
function setSelected(date){if(!active)return;const i=active.rows.findIndex(r=>r.date===date);if(i>=0){active.index=i;$('visualSlider').value=String(i);draw();}}
function draw(){
 if(!active)return;
 const {rows,keys,colors,market,currency,tickers}=active;
 if(!rows.length){clearVisualPerformance();$('visualHero').textContent='원장 기록 이후 조회 가능한 날짜가 없습니다.';return;}
 const first=rows[0],row=rows[active.index],max=Math.max(0,...rows.map(r=>finite(r.total)?r.total:0)),series=keys.map(key=>({key,label:key,color:colors[key]}));
 $('visualDay').textContent=row.date;$('visualSlider').value=String(active.index);$('visualSlider').setAttribute('aria-valuetext',row.date);
 const summary=periodSummary(rows,row.date),base=rows.find(r=>r.date===summary.baseDate);
 const hero=$('visualHero');hero.replaceChildren(donut(base,keys,colors,max,currency,'성과 기준 자산'),donut(row,keys,colors,max,currency,'선택일 자산'));
 $('visualPeriodSummary').textContent='성과 계산 기준일 '+(summary.baseDate||'미확보')+' · 선택일까지 평가 가능 '+summary.validDays+'/'+summary.days+'일'+(summary.baseDate&&summary.baseDate!==first.date?' · 조회 시작일과 성과 기준일이 다릅니다.':'')+(summary.missing.length?' · 선택일 미확보: '+summary.missing.join(', '):'')+(summary.returnPct===null?' · 연속 수익률 계산 불가 또는 기준일 이전':'')+' · 투자손익 = 자산 증감 − 순외부유입';
 const pp=n=>finite(n)?(n>0?'+':'')+fmt(n,2)+'%p':'—';
 const metrics=el('div',undefined,'visual-metrics');for(const [name,value,n] of [['자산 증감',money(summary.assetChange,currency),summary.assetChange],['순외부유입',money(summary.netFlow,currency),null],['투자손익 (입출금 제외)',money(summary.investmentGain,currency),summary.investmentGain],['입출금 조정 수익률',pct(summary.returnPct),summary.returnPct],['NASDAQ 100 대비',pp(summary.ndxExcess),summary.ndxExcess],['S&P 500 대비',pp(summary.spxExcess),summary.spxExcess]]){const card=el('div');card.append(el('small',name),el('strong',value,finite(n)?n>0?'positive':n<0?'negative':'':''));metrics.append(card);}hero.append(metrics);
 const sampled=sampleTimeline(rows,$('visualGranularity').value),pick=setSelected;
 const tradeMarkers=rows.flatMap(r=>r.trades.map(t=>({...t,date:r.date,value:r.total})));
 const percent=active.assetMode==='weight';
 $('assetAmountMode').setAttribute('aria-pressed',String(!percent));$('assetWeightMode').setAttribute('aria-pressed',String(percent));
 $('assetChartHint').textContent=percent?'종목별 평가 비중 · 합계 100% · 같은 날짜 선택과 연동':'전체 높이 = 총자산 · 각 색상 두께 = 실제 종목 평가액 · 초록/분홍점 = 매수/매도일';
 $('historyAssets').dataset.title=percent?'종목별 자산 비중':'종목별 누적 평가금액';
 plot($('historyAssets'),sampled,series,{stack:true,percent,keys,selected:row.date,pick,markers:percent?[]:tradeMarkers});
 const root=$('visualTreemap');root.replaceChildren();const items=composition(row,keys),hint=$('visualTreemapDetail');
 hint.textContent='선택일 '+row.date+' · 종목에 마우스를 올리거나 터치하면 상세정보가 표시됩니다.';
 if(!items)root.textContent='해당 날짜의 완전한 평가자료가 없습니다.';
 else{
  // Use the rendered width for readable, proportional rectangles on desktop and mobile.
  const W=Math.max(280,Math.min(1200,root.clientWidth||600)),H=W<520?300:Math.round(Math.min(390,Math.max(300,W*.42)));
  const g=svg('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'선택일 보유자산 히트맵'});g.classList.add('visual-svg');
  for(const t of treemap(items,0,0,W,H)){
   const isCash=t.key==='현금',quantity=isCash?'':fmt(row.quantities[t.key]||0,Number.isInteger(row.quantities[t.key]||0)?0:6).replace(/(\.\d*?[1-9])0+$|\.0+$/,'$1')+'주',weight=fmt(t.value/row.total*100,1)+'%',change=isCash?null:priceChange(market,t.key,first.date,row.date,currency);
   const description=[t.key,quantity,money(t.value,currency),weight,isCash?'':'기간 주가 '+pct(change)].filter(Boolean).join(' · ');
   const group=svg('g',{role:'button',tabindex:0,'aria-label':description,'data-ticker':t.key});
   const rect=svg('rect',{x:t.x+1,y:t.y+1,width:Math.max(0,t.w-2),height:Math.max(0,t.h-2),rx:4,fill:colorReturn(change),stroke:'#142036'});
   group.append(rect,svg('title',{},description));
   // Prioritize ticker and quantity. Fit labels inside the true area, never enlarge tiny positions.
   const fit=(s,max,min)=>Math.min(max,(t.w-8)/(Math.max(1,s.length)*.72));
   const nameSize=fit(t.key,W<520?17:27,10),qtySize=quantity?fit(quantity,W<520?15:23,9):0;
   const labels=[];
   if(t.h>=14&&nameSize>=9)labels.push({text:t.key,size:nameSize,weight:700});
   if(quantity&&qtySize>=9&&labels.length&&t.h>=nameSize+qtySize+7)labels.push({text:quantity,size:qtySize,weight:650});
   const optionalSize=Math.min(W<520?12:15,fit(weight,15,9));
   if(optionalSize>=9&&labels.length&&t.h>=labels.reduce((a,l)=>a+l.size+4,0)+optionalSize+10)labels.push({text:weight,size:optionalSize});
   const changeSize=fit(pct(change),W<520?11:14,9);
   if(!isCash&&finite(change)&&changeSize>=9&&labels.length&&t.h>=labels.reduce((a,l)=>a+l.size+4,0)+changeSize+10)labels.push({text:pct(change),size:changeSize});
   const block=labels.reduce((a,l)=>a+l.size+4,0)-4;let y=t.y+(t.h-block)/2;
   for(const label of labels){group.append(svg('text',{x:t.x+t.w/2,y:y+label.size*.82,'text-anchor':'middle',fill:'#fff','font-size':label.size,'font-weight':label.weight||400,'pointer-events':'none'},label.text));y+=label.size+4;}
   const describe=()=>{hint.textContent=description;};group.onmouseenter=describe;group.onfocus=describe;
   const choose=()=>{describe();if(!isCash){const sel=$('historyTradeTicker');if([...sel.options].some(o=>o.value===t.key)){sel.value=t.key;sel.onchange?.();}}};
   group.style.cursor='pointer';group.onclick=choose;group.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};g.append(group);
  }
  root.append(g);
 }
 const detail=$('visualSelection');detail.replaceChildren();
 if(items)for(const t of items){const line=el('div',undefined,'visual-holding');line.append(el('i'));line.firstChild.style.background=colors[t.key];line.append(t.key==='현금'?el('strong',t.key):createTickerChartButton(t.key),el('span',t.key==='현금'?'—':fmt(row.quantities[t.key]||0)+'주'),el('span',money(t.value,currency)),el('span',fmt(t.value/row.total*100,1)+'%'));detail.append(line);}
 const choices=[...$('visualComparePicks').querySelectorAll('input:checked')].map(n=>n.value);
 const compare=comparisonRows(sampled,market,choices,currency,summary.baseDate);
 plot($('historyPerformance'),compare,[{key:'portfolio',label:'내 운용성과',color:'#a992ff'},{key:'ndx',label:'NASDAQ 100',color:'#70c8ee',dash:'6 3'},{key:'spx',label:'S&P 500',color:'#eac37e',dash:'3 4'},...choices.map((t,i)=>({key:'stock:'+t,label:t,color:pal[(i+3)%pal.length]}))],{selected:row.date,pick});
 drawHeatmap();
 renderReview();
 if(typeof active.onDateChange==='function')active.onDateChange(row.date);
}
export function renderReview(){if(!active)return;const ticker=$('historyTradeTicker').value,row=active.rows[active.index],first=active.rows[0],root=$('visualReview');root.replaceChildren();if(!row||!first||!ticker){root.textContent='조회할 종목 없음';return;}
 const trades=active.rows.filter(r=>r.date<=row.date).flatMap(r=>r.trades.filter(t=>t.symbol===ticker).map(t=>({...t,date:r.date})));
 const start=first.quantities[ticker]||0,end=row.quantities[ticker]||0;
 root.append(el('div',ticker+' 보유수량 '+fmt(start)+' → '+fmt(end)+'주','visual-review-stat'),el('div','기간 주가 변화 '+pct(priceChange(active.market,ticker,first.date,row.date,'USD')),'visual-review-stat'));
 if(!trades.length){root.append(el('p','선택일까지 실제 매매 기록 없음 · 관심종목의 주가 흐름은 비교할 수 있습니다.','muted'));return;}
 const last=trades.at(-1),after=reviewTrade(last,active.market,row.date);
 root.append(el('p',last.date+' '+(last.type==='BUY'?'매수':'매도')+' '+fmt(last.qty)+'주 · 체결가 USD '+fmt(last.price,2),'muted'),el('strong',after?'체결가 대비 '+after.date+' 종가 '+pct(after.change):'체결 이후 종가 미확보',after&&after.change>0?'positive':after&&after.change<0?'negative':''));
}
function drawHeatmap(){
 if(!active)return;
 const {rows,market,currency,tickers,heatMode}=active,root=$('visualMarketHeat');
 const symbols=['NDX','SPX',...tickers.filter(t=>!['NDX','SPX'].includes(t))];
 const periods=heatPeriods(rows,market,symbols,heatMode);
 const pageSize=heatMode==='day'?31:heatMode==='week'?26:24,lastPage=Math.max(0,Math.ceil(periods.length/pageSize)-1);
 const page=Math.max(0,Math.min(lastPage,active.heatPage??lastPage));active.heatPage=page;
 const shown=periods.slice(page*pageSize,(page+1)*pageSize),signature=heatMode+'|'+page;
 for(const button of document.querySelectorAll('[data-heat-mode]'))button.setAttribute('aria-pressed',String(button.dataset.heatMode===heatMode));
 $('visualHeatPrev').disabled=page===0;$('visualHeatNext').disabled=page===lastPage;
 $('visualHeatPage').textContent=shown.length?shown[0].start+' ~ '+shown.at(-1).end+' · '+(page+1)+' / '+(lastPage+1):'조회 가능한 기간 없음';
 if(active.heatRendered===signature)return;
 active.heatRendered=signature;root.replaceChildren();$('visualHeatDetail').textContent='셀에 마우스를 올리거나 터치하면 실제 비교 종가와 날짜가 표시됩니다.';
 if(!shown.length){root.textContent='조회 가능한 주가 자료 없음';return;}
 const table=el('table',undefined,'visual-heat-table'),thead=table.createTHead(),header=thead.insertRow();
 const th=el('th','종목');th.scope='col';header.append(th);
 for(const p of shown){const cell=el('th',heatMode==='month'?p.key:heatMode==='week'?p.start.slice(5)+'~'+p.end.slice(5):p.start.slice(5));cell.scope='col';cell.title=p.start+' ~ '+p.end;header.append(cell);}
 const tbody=table.createTBody(),labels={NDX:'NASDAQ 100',SPX:'S&P 500'};
 const heatColor=v=>!finite(v)?'#33445a':Math.abs(v)<1e-10?'#475569':v>0?'rgba(16,150,107,'+(0.35+0.65*Math.min(v/20,1))+')':'rgba(190,53,77,'+(0.35+0.65*Math.min(-v/20,1))+')';
 for(const ticker of symbols){
  const tr=tbody.insertRow(),name=el('th');name.scope='row';name.append(labels[ticker]?el('span',labels[ticker]):createTickerChartButton(ticker));tr.append(name);
  for(const p of shown){const cell=tr.insertCell(),result=heatReturn(market,ticker,p,currency),button=el('button',result?pct(result.change):'—','visual-heat-cell');button.type='button';button.style.background=heatColor(result?.change);
   const detail=(labels[ticker]||ticker)+' · '+p.start+' ~ '+p.end+(result?' · '+result.startDate+' '+currency+' '+fmt(result.first,2)+' → '+result.endDate+' '+currency+' '+fmt(result.last,2)+' · '+pct(result.change):' · 비교 종가/환율 미확보');
   button.title=detail;button.setAttribute('aria-label',detail);
   const describe=()=>$('visualHeatDetail').textContent=detail;button.onmouseenter=describe;button.onfocus=describe;button.onclick=()=>{setVisualDate(p.end);describe();};cell.append(button);
  }
 }
 root.append(table);
}
export function renderVisualPerformance(rows,market,data,currency,onDateChange){
 stopVisualPlayback();
 const saved=active?.rows[active.index]?.date,oldChoices=new Set([...$('visualComparePicks').querySelectorAll('input:checked')].map(n=>n.value)),oldTicker=$('historyTradeTicker').value;
 const keys=assetKeys(rows),colors=Object.fromEntries(keys.map((k,i)=>[k,k==='현금'?'#8995a7':pal[i%pal.length]]));
 const tickers=[...new Set([...rows.flatMap(r=>[...Object.keys(r.quantities),...r.trades.map(t=>t.symbol)]),...(Array.isArray(data.watchlist)?data.watchlist:[])])].filter(t=>typeof t==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(t)).sort();
 const oldIndex=rows.findIndex(r=>r.date===saved);if(!rows.length){clearVisualPerformance();$('visualHero').textContent='원장 기록 이후 조회 가능한 날짜가 없습니다.';return;}
 const sameRange=active?.rows[0]?.date===rows[0].date&&active?.rows.at(-1)?.date===rows.at(-1).date;
 active={rows,market,currency,keys,colors,tickers,onDateChange,index:oldIndex>=0?oldIndex:Math.max(0,rows.length-1),assetMode:active?.assetMode||'amount',heatMode:sameRange?active.heatMode:defaultHeatMode(rows),heatPage:sameRange?active.heatPage:null,heatRendered:null};
 $('assetAmountMode').onclick=()=>{active.assetMode='amount';draw();};$('assetWeightMode').onclick=()=>{active.assetMode='weight';draw();};
 for(const button of document.querySelectorAll('[data-heat-mode]'))button.onclick=()=>{active.heatMode=button.dataset.heatMode;active.heatPage=null;active.heatRendered=null;drawHeatmap();};
 $('visualHeatPrev').onclick=()=>{active.heatPage--;drawHeatmap();};$('visualHeatNext').onclick=()=>{active.heatPage++;drawHeatmap();};
 const slider=$('visualSlider');slider.max=String(Math.max(0,rows.length-1));slider.disabled=rows.length<2;slider.oninput=()=>{stopVisualPlayback();if(!active)return;active.index=Number(slider.value);draw();};
 $('visualPrev').onclick=()=>{stopVisualPlayback();if(!active)return;active.index=Math.max(0,active.index-1);draw();};$('visualNext').onclick=()=>{stopVisualPlayback();if(!active)return;active.index=Math.min(rows.length-1,active.index+1);draw();};
 $('visualPlay').onclick=()=>{if(!active||rows.length<2)return;if(playTimer){stopVisualPlayback();return;}if(active.index===rows.length-1)active.index=0;$('visualPlay').textContent='Ⅱ 정지';draw();playTimer=setInterval(()=>{if(!active||document.hidden||$('historyPanel').hidden||$('portfolioPrivate').hidden||active.index>=rows.length-1){stopVisualPlayback();return;}active.index++;draw();},600);};
 $('visualGranularity').onchange=draw;
 const picks=$('visualComparePicks');picks.replaceChildren();
 for(const ticker of tickers){const label=el('label'),cb=el('input');cb.type='checkbox';cb.value=ticker;cb.checked=oldChoices.has(ticker);cb.onchange=()=>{const checked=picks.querySelectorAll('input:checked');if(checked.length>5){cb.checked=false;return;}draw();};label.append(cb,document.createTextNode(ticker+(market.has(ticker)?'':' (미확보)')));picks.append(label);}
 const sel=$('historyTradeTicker');sel.replaceChildren();for(const ticker of tickers){const option=el('option',ticker);option.value=ticker;sel.append(option);}if(tickers.includes(oldTicker))sel.value=oldTicker;
 draw();
}
