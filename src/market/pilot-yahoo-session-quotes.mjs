// Reuse the operating site's public Yahoo quote-page extraction, TEST only.
// The public CORS proxy receives only the ticker, never a key or account data.
export const YAHOO_SESSION_MAX_AGE_MS=60*60000;
export const YAHOO_FETCH_MAX_AGE_MS=180000;
export const YAHOO_MAX_TICKERS=10;
const valid=t=>typeof t==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(t);
const raw=v=>v&&typeof v==='object'&&'raw'in v?v.raw:v;
const nyDate=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(t);
const sessions={REGULAR:'regular',PRE:'pre',POST:'post',OVERNIGHT:'overnight'};
export function parseYahooSessionPage(ticker,html,now=Date.now()){
 if(!valid(ticker)||typeof html!=='string'||html.length>8000000)throw Error('Yahoo 응답 형식 오류');
 const re=/<script\b([^>]*data-sveltekit-fetched[^>]*)>([\s\S]*?)<\/script>/gi;
 let match;const sources=[];
 while((match=re.exec(html))!==null){
  const url=match[1].match(/data-url="([^"]+)"/i)?.[1]?.replace(/&amp;/g,'&')||'';
  try{
   const u=new URL(url,'https://finance.yahoo.com');
   if(!['query1.finance.yahoo.com','query2.finance.yahoo.com','finance.yahoo.com'].includes(u.hostname))continue;
   const isQuote=u.pathname==='/v7/finance/quote'&&u.searchParams.get('symbols')===ticker&&u.searchParams.get('overnightPrice')==='true';
   const isSummary=u.pathname==='/v10/finance/quoteSummary/'+ticker;
   if(!isQuote&&!isSummary)continue;
   const wrap=JSON.parse(match[2]);if(wrap.status!==200)continue;
   const body=typeof wrap.body==='string'?JSON.parse(wrap.body):wrap.body;
   const q=isQuote?body?.quoteResponse?.result?.find(x=>x.symbol===ticker):body?.quoteSummary?.result?.[0]?.price;
   if(q?.symbol===ticker&&q.currency==='USD')sources.push(q);
  }catch{/* Skip malformed/unrelated embedded data. */}
 }
 if(!sources.length)throw Error('Yahoo 종목별 시세 데이터 미확인');
 const state=sources.map(q=>q.marketState).find(x=>typeof x==='string')||'UNKNOWN';
 const session=sessions[state];
 const candidates=[];
 for(const q of sources){
  for(const [sessionName,kind] of Object.entries(sessions)){
   const price=raw(q[kind+'MarketPrice']),seconds=raw(q[kind+'MarketTime']),at=seconds*1000;
   if(typeof price!=='number'||!Number.isFinite(price)||price<=0||!Number.isInteger(seconds)||seconds<=0||at>now+10000)continue;
   candidates.push({ticker,close:price,currency:'USD',date:nyDate(at),quoteTime:at,source:'YAHOO_SESSION',kind:'current_quote',session:sessionName,marketState:state,fetchedAt:now});
  }
 }
 const newest=xs=>xs.sort((a,b)=>b.quoteTime-a.quoteTime)[0]||null;
 const active=session?newest(candidates.filter(q=>q.session===state&&now-q.quoteTime<=YAHOO_SESSION_MAX_AGE_MS)):null;
 // On confirmed closure use the regular-session close, never relabel an old
 // overnight quote as a real-time quote. During open sessions, stale/missing
 // prices are explicitly not live; the existing daily-close fallback applies.
 const close=state==='CLOSED'?newest(candidates.filter(q=>q.session==='REGULAR'&&now-q.quoteTime<=7*86400000)):null;
 return {marketState:state,quote:active||(close?{...close,kind:'market_close'}:null)};
}
export async function fetchYahooSessionQuotes({tickers,fetcher=globalThis.fetch,signal,now=Date.now}){
 const quotes=new Map(),states=new Map(),errors=[];
 const list=[...new Set(tickers)].filter(valid).slice(0,YAHOO_MAX_TICKERS);
 for(let i=0;i<list.length;i+=5){
  if(signal?.aborted)break;
  const group=await Promise.all(list.slice(i,i+5).map(async ticker=>{
   try{
    const response=await fetcher('https://proxy.cors.dev/https://finance.yahoo.com/quote/'+encodeURIComponent(ticker)+'/',{cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal});
    if(!response.ok)return {ticker,error:'Yahoo HTTP '+response.status};
    const result=parseYahooSessionPage(ticker,await response.text(),now());
    return {ticker,...result};
   }catch{return {ticker,error:'Yahoo 최신 시세 조회 실패'}}
  }));
  for(const item of group){if(item.marketState)states.set(item.ticker,item.marketState);if(item.quote)quotes.set(item.ticker,item.quote);else errors.push({ticker:item.ticker,error:item.error||'Yahoo 유효 세션 시세 미확인'})}
  if(group.some(x=>x.error==='Yahoo HTTP 429'))break;
 }
 return {quotes,states,errors};
}
export function validYahooSessionQuote(q,now=Date.now()){
 if(q?.source!=='YAHOO_SESSION'||!Number.isFinite(q.fetchedAt)||now-q.fetchedAt>YAHOO_FETCH_MAX_AGE_MS||q.fetchedAt>now+10000)return false;
 if(q.kind==='market_close')return q.marketState==='CLOSED'&&q.session==='REGULAR'&&now-q.quoteTime<=7*86400000;
 return q.kind==='current_quote'&&!!sessions[q.marketState]&&q.session===q.marketState&&now-q.quoteTime<=YAHOO_SESSION_MAX_AGE_MS;
}
export function yahooSessionLabel(q,now=Date.now()){
 const name={REGULAR:'정규장',PRE:'프리마켓',POST:'애프터마켓',OVERNIGHT:'주간거래'}[q?.session]||'세션 미확인';
 return q?.kind==='market_close'?'정규장 종가':name+(now-q.quoteTime>180000?' · 최근 체결(3분 초과)':' · 최신 체결');
}
