// Display only. Third-party code runs in an cross-origin hosted frame.
// Never pass ledger contents, account IDs, authentication or portfolio data.
const groups={
 NASDAQ:'TSLA MSFT GOOGL GOOG AMZN META SPCX TQQQ TSLL AAPL NVDA AVGO COST LIN WMT QQQ',
 AMEX:'BITU USD SOXL SPY XLK XLF XLE XLI XLY XLP XLV XLC XLU XLB XLRE',
 NYSE:'JPM BAC XOM CVX CAT GE LLY JNJ NEE DUK SHW PLD AMT',
};
const symbols=new Map(Object.entries(groups).flatMap(([exchange,tickers])=>tickers.split(' ').map(t=>[t,exchange+':'+t])));
export function widgetSymbol(ticker){
 const t=String(ticker??'').trim().toUpperCase();
 return symbols.get(t)||null;
}
export function isChartTicker(ticker){return /^[A-Z][A-Z0-9.-]{0,15}$/.test(String(ticker??'').trim().toUpperCase());}
// Navigate directly to the provider's hosted iframe instead of nesting its
// bootstrap script in an opaque srcdoc origin. Only fixed public settings pass.
export function chartFrameUrl(ticker){
 const symbol=widgetSymbol(ticker);
 if(!symbol)throw Error('거래소 코드 미확인');
 const settings={symbol,interval:'5',timezone:'Asia/Seoul',theme:'dark',style:'1',locale:'kr',allow_symbol_change:false,hide_side_toolbar:true,hide_top_toolbar:false,hide_volume:false,withdateranges:true,autosize:true,save_image:false,calendar:false,hotlist:false,backgroundColor:'#131722',width:'100%',height:'100%'};
 return 'https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=kr#'+encodeURIComponent(JSON.stringify(settings));
}
function style(el,values){Object.assign(el.style,values);return el;}
let dialog=null,frameHost=null,heading=null,status=null,external=null,returnFocus=null,retry=null;
let chartBounds=null;
const EDGE=8;
function viewport(){
 return {width:document.documentElement.clientWidth||innerWidth,height:window.visualViewport?.height||innerHeight};
}
const clamp=(n,min,max)=>Math.min(Math.max(n,min),Math.max(min,max));
export function constrainChartBounds(bounds,view){
 const maxW=Math.max(1,view.width-EDGE*2),maxH=Math.max(1,view.height-EDGE*2);
 const width=clamp(bounds.width,Math.min(320,maxW),maxW),height=clamp(bounds.height,Math.min(300,maxH),maxH);
 return {width,height,left:clamp(bounds.left,EDGE,view.width-width-EDGE),top:clamp(bounds.top,EDGE,view.height-height-EDGE)};
}
function defaultBounds(){
 const v=viewport(),width=Math.min(960,v.width-2*EDGE),height=Math.min(690,v.height-2*EDGE);
 return constrainChartBounds({width,height,left:(v.width-width)/2,top:(v.height-height)/2},v);
}
function applyBounds(d,bounds){
 chartBounds=constrainChartBounds(bounds,viewport());
 for(const key of ['left','top','width','height'])d.style[key]=chartBounds[key]+'px';
}
function attachGeometryHandle(handle,d,resize){
 let gesture=null;
 const finish=e=>{if(gesture?.id!==e.pointerId)return;gesture=null;if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);};
 handle.addEventListener('pointerdown',e=>{
  if(e.button!==0||!e.isPrimary||!d.open)return;
  e.preventDefault();handle.setPointerCapture(e.pointerId);
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:{...chartBounds}};
 });
 handle.addEventListener('pointermove',e=>{
  if(gesture?.id!==e.pointerId)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,b=gesture.start;
  if(resize){const v=viewport();applyBounds(d,{...b,width:Math.min(b.width+dx,v.width-b.left-EDGE),height:Math.min(b.height+dy,v.height-b.top-EDGE)});}
  else applyBounds(d,{...b,left:b.left+dx,top:b.top+dy});
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,finish);
 handle.addEventListener('keydown',e=>{
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta||!d.open)return;
  e.preventDefault();const step=e.shiftKey?40:12,[x,y]=delta.map(v=>v*step),b=chartBounds;
  if(resize){const v=viewport();applyBounds(d,{...b,width:Math.min(b.width+x,v.width-b.left-EDGE),height:Math.min(b.height+y,v.height-b.top-EDGE)});}
  else applyBounds(d,{...b,left:b.left+x,top:b.top+y});
 });
}
function buildDialog(){
 const d=document.createElement('dialog');
 d.id='investlabTradingViewDialog';d.setAttribute('aria-labelledby','investlabTradingViewTitle');
 style(d,{position:'fixed',inset:'auto',margin:'0',maxWidth:'none',maxHeight:'none',overflow:'hidden',background:'#161f32',color:'#edf3ff',border:'1px solid #52637e',borderRadius:'12px',padding:'12px',boxSizing:'border-box',colorScheme:'dark',flexDirection:'column',gap:'6px'});
 const layout=document.createElement('style');layout.textContent='#investlabTradingViewDialog[open]{display:flex}';d.append(layout);
 const head=style(document.createElement('div'),{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'});
 heading=document.createElement('h2');heading.id='investlabTradingViewTitle';style(heading,{margin:'0',fontSize:'18px',cursor:'move',touchAction:'none',userSelect:'none',flex:'1',minWidth:'0',padding:'8px 0'});heading.tabIndex=0;heading.title='드래그 또는 방향키로 창 이동';attachGeometryHandle(heading,d,false);
 const reset=style(document.createElement('button'),{width:'auto',padding:'6px 8px',margin:'0',whiteSpace:'nowrap'});reset.type='button';reset.textContent='초기 크기';reset.title='창 위치와 크기 초기화';reset.onclick=()=>applyBounds(d,defaultBounds());
 const close=style(document.createElement('button'),{width:'auto',padding:'8px 12px',margin:'0'});close.type='button';close.textContent='닫기';close.onclick=()=>{d.close();clear();};head.append(heading,reset,close);
 status=style(document.createElement('p'),{fontSize:'13px',lineHeight:'1.5',color:'#becde1',margin:'8px 0'});
 frameHost=style(document.createElement('div'),{width:'100%',minWidth:'0',minHeight:'0',flex:'1 1 0',overflow:'hidden'});
 external=style(document.createElement('a'),{display:'inline-block',marginTop:'8px',color:'#a4c6ff'});external.target='_blank';external.rel='noopener noreferrer';external.textContent='TradingView에서 직접 확인';
 retry=style(document.createElement('button'),{width:'auto',padding:'6px 10px',margin:'8px 12px 0 0'});retry.type='button';retry.textContent='차트 다시 불러오기';
 const footer=style(document.createElement('div'),{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'8px',flexShrink:'0'});
 const grip=style(document.createElement('button'),{width:'36px',height:'36px',margin:'0 0 0 auto',padding:'0',fontSize:'22px',cursor:'nwse-resize',touchAction:'none',userSelect:'none',flexShrink:'0'});grip.type='button';grip.textContent='↘';grip.title='드래그 또는 방향키로 창 크기 조절';grip.setAttribute('aria-label','차트 창 크기 조절');attachGeometryHandle(grip,d,true);
 footer.append(retry,external,grip);d.append(head,status,frameHost,footer);document.body.append(d);
 const fit=()=>{if(d.open)applyBounds(d,chartBounds||defaultBounds());};
 window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
 const clear=()=>{frameHost.replaceChildren();returnFocus?.focus({preventScroll:true});returnFocus=null;};
 d.addEventListener('close',()=>{if(!d.open)clear();});
 d.addEventListener('cancel',e=>{e.preventDefault();d.close();clear();});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){d.close();clear();}}});
 return d;
}
export function openTradingViewChart(ticker,trigger=null){
 const t=String(ticker??'').trim().toUpperCase();if(!isChartTicker(t))return;
 if(!dialog)dialog=buildDialog();
 if(!dialog.open)returnFocus=trigger||document.activeElement;
 const symbol=widgetSymbol(t);heading.textContent=t+' · 주가 차트';
 external.href=symbol?'https://www.tradingview.com/symbols/'+symbol.replace(':','-')+'/':'https://www.tradingview.com/chart/?symbol='+encodeURIComponent(t);
 frameHost.replaceChildren();
 if(symbol){
  status.textContent='TradingView 제공 시세 · 거래소에 따라 실시간/지연/종가 · 포트폴리오 평가에는 사용하지 않습니다. 제목 드래그: 이동 · 우측 하단 ↘: 크기 조절 · 차트 오류 시 다시 불러오기.';
  const frame=style(document.createElement('iframe'),{display:'block',width:'100%',height:'100%',minHeight:'0',border:'0',background:'#131722'});
  frame.title=t+' TradingView 주가 차트';
  // allow-same-origin preserves the vendor's OWN origin, never our origin.
  // No same-origin srcdoc, no script injection into the authenticated page.
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');frame.referrerPolicy='no-referrer';
  frame.src=chartFrameUrl(t);frameHost.append(frame);
  retry.hidden=false;retry.onclick=()=>{if(dialog.open)openTradingViewChart(t,returnFocus);};
 }else{
  retry.hidden=true;retry.onclick=null;
  status.textContent='이 종목의 거래소 코드를 아직 확인하지 않았습니다. 잘못된 종목을 표시하지 않도록 TradingView에서 종목과 거래소를 직접 확인하세요.';
 }
 if(!dialog.open){applyBounds(dialog,chartBounds||defaultBounds());dialog.showModal();}
}
export function createTickerChartButton(ticker,label=ticker){
 const b=document.createElement('button');b.type='button';b.className='investlab-ticker-chart-link';
 b.textContent=label;b.title=ticker+' 주가 차트 열기';b.setAttribute('aria-label',ticker+' 주가 차트 열기');
 style(b,{display:'inline-block',width:'auto',padding:'2px 4px',margin:'0',background:'transparent',border:'0',color:'#a6cfff',textDecoration:'underline',textUnderlineOffset:'3px',font:'inherit',fontWeight:'700',cursor:'pointer'});
 b.addEventListener('click',e=>{e.stopPropagation();openTradingViewChart(ticker,b);});return b;
}
