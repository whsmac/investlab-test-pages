// Display only. Third-party code runs in an opaque-origin sandboxed frame.
// Never pass ledger contents, account IDs, authentication or portfolio data.
const groups={
 NASDAQ:'TSLA MSFT GOOGL GOOG AMZN META SPCX TQQQ AAPL NVDA AVGO COST LIN WMT QQQ',
 AMEX:'BITU USD SOXL SPY XLK XLF XLE XLI XLY XLP XLV XLC XLU XLB XLRE',
 NYSE:'JPM BAC XOM CVX CAT GE LLY JNJ NEE DUK SHW PLD AMT',
};
const symbols=new Map(Object.entries(groups).flatMap(([exchange,tickers])=>tickers.split(' ').map(t=>[t,exchange+':'+t])));
export function widgetSymbol(ticker){
 const t=String(ticker??'').trim().toUpperCase();
 return symbols.get(t)||null;
}
export function isChartTicker(ticker){return /^[A-Z][A-Z0-9.-]{0,15}$/.test(String(ticker??'').trim().toUpperCase());}
export function chartDocument(ticker){
 const symbol=widgetSymbol(ticker);
 if(!symbol)throw Error('거래소 코드 미확인');
 const settings={symbol,interval:'5',timezone:'Asia/Seoul',theme:'dark',style:'1',locale:'kr',allow_symbol_change:false,hide_side_toolbar:true,hide_top_toolbar:false,hide_volume:false,withdateranges:true,autosize:true,save_image:false,calendar:false,hotlist:false};
 const link='https://www.tradingview.com/symbols/'+symbol.replace(':','-')+'/';
 return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;background:#131722;color:#d1d4dc;font:12px system-ui}a{color:#9cc6ff}</style></head><body><div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div><div class="tradingview-widget-copyright"><a href="'+link+'" rel="noopener noreferrer nofollow" target="_blank">'+symbol+' chart</a> by TradingView</div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>'+JSON.stringify(settings)+'</script></div></body></html>';
}
function style(el,values){Object.assign(el.style,values);return el;}
let dialog=null,frameHost=null,heading=null,status=null,external=null,returnFocus=null;
function buildDialog(){
 const d=document.createElement('dialog');
 d.id='investlabTradingViewDialog';d.setAttribute('aria-labelledby','investlabTradingViewTitle');
 style(d,{width:'min(960px, calc(100vw - 24px))',maxWidth:'none',maxHeight:'90dvh',overflow:'auto',background:'#161f32',color:'#edf3ff',border:'1px solid #52637e',borderRadius:'12px',padding:'12px',boxSizing:'border-box',colorScheme:'dark'});
 const head=style(document.createElement('div'),{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'});
 heading=document.createElement('h2');heading.id='investlabTradingViewTitle';style(heading,{margin:'0',fontSize:'18px'});
 const close=style(document.createElement('button'),{width:'auto',padding:'8px 12px',margin:'0'});close.type='button';close.textContent='닫기';close.onclick=()=>{d.close();clear();};head.append(heading,close);
 status=style(document.createElement('p'),{fontSize:'13px',lineHeight:'1.5',color:'#becde1',margin:'8px 0'});
 frameHost=style(document.createElement('div'),{width:'100%',minWidth:'0'});
 external=style(document.createElement('a'),{display:'inline-block',marginTop:'8px',color:'#a4c6ff'});external.target='_blank';external.rel='noopener noreferrer';external.textContent='TradingView에서 직접 확인';
 d.append(head,status,frameHost,external);document.body.append(d);
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
  status.textContent='TradingView 제공 시세 · 거래소에 따라 실시간/지연/종가 · 포트폴리오 평가에는 사용하지 않습니다. 화면이 표시되지 않으면 아래 링크를 이용하세요.';
  const frame=style(document.createElement('iframe'),{display:'block',width:'100%',height:'min(60dvh, 540px)',minHeight:'260px',border:'0',background:'#131722'});
  frame.title=t+' TradingView 주가 차트';frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox');frame.referrerPolicy='no-referrer';
  frame.srcdoc=chartDocument(t);frameHost.append(frame);
 }else{
  status.textContent='이 종목의 거래소 코드를 아직 확인하지 않았습니다. 잘못된 종목을 표시하지 않도록 TradingView에서 종목과 거래소를 직접 확인하세요.';
 }
 if(!dialog.open)dialog.showModal();
}
export function createTickerChartButton(ticker,label=ticker){
 const b=document.createElement('button');b.type='button';b.className='investlab-ticker-chart-link';
 b.textContent=label;b.title=ticker+' 주가 차트 열기';b.setAttribute('aria-label',ticker+' 주가 차트 열기');
 style(b,{display:'inline-block',width:'auto',padding:'2px 4px',margin:'0',background:'transparent',border:'0',color:'#a6cfff',textDecoration:'underline',textUnderlineOffset:'3px',font:'inherit',fontWeight:'700',cursor:'pointer'});
 b.addEventListener('click',e=>{e.stopPropagation();openTradingViewChart(ticker,b);});return b;
}
