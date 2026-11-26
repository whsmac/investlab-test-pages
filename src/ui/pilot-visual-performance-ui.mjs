import {assetKeys,composition,assetRadius,treemap,priceChange,sampleTimeline,comparisonRows,reviewTrade,finite,periodSummary,quotedPrice,drawdownRows,drawdownSummary} from '../market/pilot-visual-performance.mjs';
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
export function clearVisualPerformance(){stopVisualPlayback();active=null;for(const id of ['visualPeriodSummary','visualHero','historyAssets','visualTreemap','visualTreemapDetail','visualSelection','visualComparePicks','historyPerformance','visualReview','assetDateDetail','comparisonDateDetail','performanceMetrics','riskMetrics','riskCoverage','historyDrawdown','riskDateDetail'])$(id)?.replaceChildren();if($('visualHoldingDetails'))$('visualHoldingDetails').open=false;if($('visualDay'))$('visualDay').textContent='—';if($('visualSlider')){$('visualSlider').max='0';$('visualSlider').value='0';$('visualSlider').disabled=true;}}
function legend(root,items){const l=el('div',undefined,'visual-legend');for(const item of items){const s=el('span');const dot=el('i');dot.style.background=item.color;s.append(dot,document.createTextNode(item.label));l.append(s);}root.append(l);}
function plot(root,rows,series,{stack=false,percent=false,selected,keys=[],pick,markers=[],hover,percentAxis=false,ceiling=null,limit=null}={}){
 root.replaceChildren();
 if(!rows.length){root.textContent='조회 가능한 자료 없음';return;}
 const values=stack?rows.flatMap(r=>{const c=composition(r,keys);return c?[percent?100:r.total]:[];}):rows.flatMap(r=>series.map(s=>r[s.key])).filter(finite);
 if(!values.length){root.textContent='조회 가능한 자료 없음';return;}
 const min=stack?0:Math.min(0,...values,finite(limit)?limit:0),max=percent?100:finite(ceiling)?ceiling:Math.max(...values,stack?0:1),span=max-min||1;
 const W=760,H=265,L=85,R=24,T=16,B=38;
 const start=Date.parse(rows[0].date),end=Date.parse(rows.at(-1).date);
 const x=d=>L+(W-L-R)*(end===start?.5:(Date.parse(d)-start)/(end-start));
 const y=v=>H-B-(H-T-B)*(v-min)/span;
 const g=svg('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':root.dataset.title||'기간 변화 그래프'});g.classList.add('visual-svg');
 for(let i=0;i<5;i++){const v=min+span*i/4,yy=y(v);g.append(svg('line',{x1:L,x2:W-R,y1:yy,y2:yy,stroke:'#35435b','stroke-dasharray':'3 4'}),svg('text',{x:L-7,y:yy+4,'text-anchor':'end',fill:'#bac9df','font-size':12},percent||percentAxis?fmt(v,1)+'%':Math.abs(v)>=1000000?fmt(v/1000000,1)+'M':fmt(v,Math.abs(v)<100?1:0)));}
 if(finite(limit)){g.append(svg('line',{x1:L,x2:W-R,y1:y(limit),y2:y(limit),stroke:'#f38b9e','stroke-dasharray':'6 4'}),svg('text',{x:W-R-3,y:y(limit)-5,'text-anchor':'end',fill:'#f38b9e','font-size':11},'위험 기준 '+fmt(limit)+'%'));}
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
 if(pick||hover){g.style.cursor='crosshair';const nearest=e=>{const r=g.getBoundingClientRect(),pos=(e.clientX-r.left)/r.width*W,ratio=Math.max(0,Math.min(1,(pos-L)/(W-L-R))),target=start+ratio*(end-start);let best=rows[0];for(const row of rows)if(Math.abs(Date.parse(row.date)-target)<Math.abs(Date.parse(best.date)-target))best=row;return best.date;};if(pick)g.onclick=e=>pick(nearest(e));if(hover){g.onpointermove=e=>{if(e.pointerType!=='touch')hover(nearest(e));};g.onpointerleave=()=>hover(selected);}}
 root.append(g);legend(root,series.map(s=>({label:s.label,color:s.color})));
}
export function selectedVisualDate(){return active?.rows[active.index]?.date||null;}
export function setVisualDate(date){stopVisualPlayback();setSelected(date);}
function drawPreservingScroll(){
 const top=window.scrollY;
 draw();
 const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
 const target=Math.min(top,max);
 if(Math.abs(window.scrollY-target)>1)window.scrollTo({top:target,behavior:'instant'});
}
function setSelected(date){if(!active)return;const i=active.rows.findIndex(r=>r.date===date);if(i>=0){active.index=i;$('visualSlider').value=String(i);drawPreservingScroll();}}
function draw(){
 if(!active)return;
 const {rows,keys,colors,market,currency,priceCurrency,tickers}=active;
 if(!rows.length){clearVisualPerformance();$('visualHero').textContent='원장 기록 이후 조회 가능한 날짜가 없습니다.';return;}
 const first=rows[0],row=rows[active.index],series=keys.map(key=>({key,label:key,color:colors[key]}));
 $('visualDay').textContent=row.date;$('visualSlider').value=String(active.index);$('visualSlider').setAttribute('aria-valuetext',row.date);
 const summary=periodSummary(rows,row.date),base=rows.find(r=>r.date===summary.baseDate);
 const hero=$('visualHero');hero.replaceChildren();
 $('visualPeriodSummary').textContent='성과 계산 기준일 '+(summary.baseDate||'미확보')+' · 선택일까지 평가 가능 '+summary.validDays+'/'+summary.days+'일'+(summary.baseDate&&summary.baseDate!==first.date?' · 조회 시작일과 성과 기준일이 다릅니다.':'')+(summary.missing.length?' · 선택일 미확보: '+summary.missing.join(', '):'')+(summary.returnPct===null?' · 연속 수익률 계산 불가 또는 기준일 이전':'')+' · 투자손익 = 자산 증감 − 순외부유입';
 const pp=n=>finite(n)?(n>0?'+':'')+fmt(n,2)+'%p':'—';
 function metricGrid(root,items){root.replaceChildren();for(const [name,value,n] of items){const card=el('div');card.append(el('small',name),el('strong',value,finite(n)?n>0?'positive':n<0?'negative':'':''));root.append(card);}}
 metricGrid(hero,[['성과 기준 자산 · '+(base?.date||'—'),money(base?.total,currency),null],['선택일 자산 · '+row.date,money(row.total,currency),null],['자산 증감',money(summary.assetChange,currency),summary.assetChange],['순외부유입',money(summary.netFlow,currency),null],['투자손익 (입출금 제외)',money(summary.investmentGain,currency),summary.investmentGain]]);
 metricGrid($('performanceMetrics'),[['입출금 조정 수익률',pct(summary.returnPct),summary.returnPct],['NASDAQ 100 대비',pp(summary.ndxExcess),summary.ndxExcess],['S&P 500 대비',pp(summary.spxExcess),summary.spxExcess]]);
 $('comparisonCurrencyNote').textContent='내 운용성과는 입출금 조정 · 지수와 종목은 '+currency+' 기준 가격 변화율 · 상세 종가 '+priceCurrency+' · 최대 5종목 추가';
 const sampled=sampleTimeline(rows,$('visualGranularity').value),pick=setSelected;
 const tradeMarkers=rows.flatMap(r=>r.trades.map(t=>({...t,date:r.date,value:r.total})));
 plot($('historyAssets'),sampled,series,{stack:true,keys,selected:row.date,pick,markers:tradeMarkers,hover:date=>renderAssetDetail(rows.find(r=>r.date===date)||row,keys,colors,currency)});
 renderAssetDetail(row,keys,colors,currency);
 const root=$('visualTreemap');root.replaceChildren();const items=composition(row,keys),hint=$('visualTreemapDetail');
 hint.textContent='선택일 '+row.date+' · 종목에 마우스를 올리거나 터치하면 상세정보가 표시됩니다.';
 if(!items)root.textContent='해당 날짜의 완전한 평가자료가 없습니다.';
 else{
  // Use the rendered width for readable, proportional rectangles on desktop and mobile.
  const W=Math.max(280,Math.min(1200,root.clientWidth||600)),H=W<520?300:Math.round(Math.min(390,Math.max(300,W*.42)));
  const g=svg('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'선택일 보유자산 히트맵'});g.classList.add('visual-svg');
  for(const t of treemap(items,0,0,W,H)){
   const isCash=t.key==='현금',quantity=isCash?'':fmt(row.quantities[t.key]||0,Number.isInteger(row.quantities[t.key]||0)?0:6).replace(/(\.\d*?[1-9])0+$|\.0+$/,'$1')+'주',weight=fmt(t.value/row.total*100,1)+'%',change=isCash?null:priceChange(market,t.key,first.date,row.date,currency);
   const description=[t.key,quantity,money(t.value,currency),weight,isCash?'':'종가 '+priceText(quotedPrice(market,t.key,row.date,priceCurrency),priceCurrency),isCash?'':'기간 주가 '+pct(change)].filter(Boolean).join(' · ');
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
 const choices=[...$('visualComparePicks').querySelectorAll('input:checked')].map(n=>n.value),baseSeries=[{key:'portfolio',label:'내 운용성과',color:'#a992ff'},{key:'ndx',label:'NASDAQ 100',color:'#70c8ee',dash:'6 3'},{key:'spx',label:'S&P 500',color:'#eac37e',dash:'3 4'}];
 const compareSeries=[...baseSeries.filter(s=>choices.includes(s.key)),...choices.filter(t=>!baseSeries.some(s=>s.key===t)).map((t,i)=>({key:'stock:'+t,label:t,color:pal[(i+3)%pal.length]}))];
 const stocks=choices.filter(t=>!baseSeries.some(s=>s.key===t)),compare=comparisonRows(sampled,market,stocks,currency,summary.baseDate);
 const detailAt=date=>{const selectedRow=rows.find(r=>r.date===date)||row;renderComparisonDetail(comparisonRows([selectedRow],market,stocks,currency,summary.baseDate)[0],compareSeries,market,priceCurrency);};
 plot($('historyPerformance'),compare,compareSeries,{selected:row.date,pick,hover:detailAt,percentAxis:true});
 detailAt(row.date);
 drawRisk();
 renderReview();
 if(typeof active.onDateChange==='function')active.onDateChange(row.date);
}
export function renderReview(){if(!active)return;const ticker=$('historyTradeTicker').value,row=active.rows[active.index],first=active.rows[0],root=$('visualReview');root.replaceChildren();if(!row||!first||!ticker){root.textContent='조회할 종목 없음';return;}
 const trades=active.rows.filter(r=>r.date<=row.date).flatMap(r=>r.trades.filter(t=>t.symbol===ticker).map(t=>({...t,date:r.date})));
 const start=first.quantities[ticker]||0,end=row.quantities[ticker]||0;
 root.append(el('div',ticker+' 보유수량 '+fmt(start)+' → '+fmt(end)+'주','visual-review-stat'),el('div','기간 주가 변화 '+pct(priceChange(active.market,ticker,first.date,row.date,active.currency)),'visual-review-stat'));
 if(!trades.length){root.append(el('p','선택일까지 실제 매매 기록 없음 · 관심종목의 주가 흐름은 비교할 수 있습니다.','muted'));return;}
 const last=trades.at(-1),after=reviewTrade(last,active.market,row.date);
 root.append(el('p',last.date+' '+(last.type==='BUY'?'매수':'매도')+' '+fmt(last.qty)+'주 · 체결가 '+priceText(quotedPrice(active.market,last.symbol,last.date,active.priceCurrency,last.price),active.priceCurrency),'muted'),el('strong',after?'체결가 대비 '+after.date+' 종가 (USD 기준) '+pct(after.change):'체결 이후 종가 미확보',after&&after.change>0?'positive':after&&after.change<0?'negative':''));
}
function renderAssetDetail(row,keys,colors,currency){
 const root=$('assetDateDetail');root.replaceChildren(el('strong',row.date+' · 총자산 '+money(row.total,currency)));
 const items=composition(row,keys);if(!items){root.append(el('p','완전한 평가자료 없음','muted'));return;}
 for(const t of items){const line=el('div',undefined,'visual-holding');line.append(el('i'));line.firstChild.style.background=colors[t.key];line.append(el('strong',t.key),el('span',t.key==='현금'?'—':fmt(row.quantities[t.key]||0)+'주'),el('span',money(t.value,currency)),el('span',fmt(t.value/row.total*100,1)+'%'));root.append(line);}
}
const priceText=(v,c)=>finite(v)?c+' '+fmt(v,c==='USD'?1:0):'—';
function renderComparisonDetail(row,series,market,priceCurrency){
 const root=$('comparisonDateDetail');root.replaceChildren(el('strong',row.date+' · 수익률 비교'));
 if(!series.length){root.append(el('p','비교할 항목을 선택하세요.','muted'));return;}
 for(const s of series){const line=el('div',undefined,'visual-comparison-line'),dot=el('i');dot.style.background=s.color;line.append(dot,el('span',s.label+(s.key.startsWith('stock:')?' · 종가 '+priceText(quotedPrice(market,s.key.slice(6),row.date,priceCurrency),priceCurrency):'')),el('strong',pct(row[s.key]),finite(row[s.key])?row[s.key]>0?'positive':row[s.key]<0?'negative':'':''));root.append(line);}
}
function drawRisk(){
 if(!active)return;
 const {rows,index}=active,day=rows[index].date,risk=drawdownRows(rows),summary=drawdownSummary(risk,day),root=$('riskMetrics');
 root.replaceChildren();for(const [label,value] of [['선택일까지 최대 낙폭 (MDD)',pct(summary.mdd)],['선택일 고점 대비 낙폭',pct(summary.current)],['고점 회복 필요 수익률',pct(summary.recovery)],['최대 낙폭 발생일',summary.mddDate||'—']]){const tile=el('div');tile.append(el('small',label),el('strong',value,label.includes('낙폭')&&!label.includes('발생일')?'negative':''));root.append(tile);}
 $('riskCoverage').textContent='선택일 '+day+' · 계산 가능 '+summary.validDays+'/'+summary.days+'일'+(summary.complete?'':' · 결측 또는 기준일 이전 포함: 확인 가능한 구간의 MDD이며 전체 기간 확정값 아님');
 const checked=new Set([...$('riskPicks').querySelectorAll('input:checked')].map(x=>x.value)),series=[{key:'portfolio',label:'내 운용성과',color:'#a992ff'},{key:'ndx',label:'NASDAQ 100',color:'#70c8ee',dash:'6 3'},{key:'spx',label:'S&P 500',color:'#eac37e',dash:'3 4'}].filter(s=>checked.has(s.key));
 const n=Number($('riskLimit').value),limit=$('riskLimitEnabled').checked&&n>=1&&n<=99?-n:null;
 const describe=date=>{const item=risk.find(r=>r.date===date)||risk[index],detail=$('riskDateDetail');detail.replaceChildren(el('strong',item.date+' · 고점 대비 낙폭'));for(const s of series){const v=drawdownSummary(risk,item.date,s.key),line=el('div',undefined,'visual-comparison-line'),dot=el('i');dot.style.background=s.color;line.append(dot,el('span',s.label+' · MDD '+pct(v.mdd)+(v.complete?'':' (부분)')),el('strong',pct(item[s.key]),'negative'));detail.append(line);}};
 plot($('historyDrawdown'),risk,series,{selected:day,pick:setVisualDate,hover:describe,percentAxis:true,ceiling:0,limit});describe(day);
}
export function renderVisualPerformance(rows,market,data,currency,onDateChange,priceCurrency=currency){
 stopVisualPlayback();
 const saved=active?.rows[active.index]?.date,oldChoices=new Set(active?[...$('visualComparePicks').querySelectorAll('input:checked')].map(n=>n.value):['portfolio','ndx','spx']),oldTicker=$('historyTradeTicker').value;
 const keys=assetKeys(rows),colors=Object.fromEntries(keys.map((k,i)=>[k,k==='현금'?'#8995a7':pal[i%pal.length]]));
 const tickers=[...new Set([...rows.flatMap(r=>[...Object.keys(r.quantities),...r.trades.map(t=>t.symbol)]),...(Array.isArray(data.watchlist)?data.watchlist:[])])].filter(t=>typeof t==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(t)).sort();
 const oldIndex=rows.findIndex(r=>r.date===saved);if(!rows.length){clearVisualPerformance();$('visualHero').textContent='원장 기록 이후 조회 가능한 날짜가 없습니다.';return;}
 active={rows,market,currency,priceCurrency,keys,colors,tickers,onDateChange,index:oldIndex>=0?oldIndex:Math.max(0,rows.length-1)};
 const slider=$('visualSlider');slider.max=String(Math.max(0,rows.length-1));slider.disabled=rows.length<2;slider.oninput=()=>{stopVisualPlayback();if(!active)return;active.index=Number(slider.value);drawPreservingScroll();};
 $('visualPrev').onclick=()=>{stopVisualPlayback();if(!active)return;active.index=Math.max(0,active.index-1);drawPreservingScroll();};$('visualNext').onclick=()=>{stopVisualPlayback();if(!active)return;active.index=Math.min(rows.length-1,active.index+1);drawPreservingScroll();};
 $('visualPlay').onclick=()=>{if(!active||rows.length<2)return;if(playTimer){stopVisualPlayback();return;}if(active.index===rows.length-1)active.index=0;$('visualPlay').textContent='Ⅱ 정지';drawPreservingScroll();playTimer=setInterval(()=>{if(!active||document.hidden||$('historyPanel').hidden||$('portfolioPrivate').hidden||active.index>=rows.length-1){stopVisualPlayback();return;}active.index++;drawPreservingScroll();},600);};
 $('visualGranularity').onchange=drawPreservingScroll;
 $('riskPicks').onchange=drawRisk;$('riskLimitEnabled').onchange=drawRisk;$('riskLimit').onchange=drawRisk;
 const picks=$('visualComparePicks');picks.replaceChildren();
 const fixed={portfolio:'내 운용성과',ndx:'NASDAQ 100',spx:'S&P 500'};
 for(const ticker of [...Object.keys(fixed),...tickers]){const label=el('label'),cb=el('input');cb.type='checkbox';cb.value=ticker;cb.checked=oldChoices.has(ticker);cb.onchange=()=>{const checked=[...picks.querySelectorAll('input:checked')].filter(n=>!Object.hasOwn(fixed,n.value));if(checked.length>5){cb.checked=false;return;}draw();};label.append(cb,document.createTextNode(fixed[ticker]||ticker+(market.has(ticker)?'':' (미확보)')));picks.append(label);}
 const sel=$('historyTradeTicker');sel.replaceChildren();for(const ticker of tickers){const option=el('option',ticker);option.value=ticker;sel.append(option);}if(tickers.includes(oldTicker))sel.value=oldTicker;
 draw();
}
