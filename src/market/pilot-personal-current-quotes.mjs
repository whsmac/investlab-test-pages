// Optional personal-use quote connection. No credentials or quote data persisted.
// Quote timestamps are freshness evidence, not proof of consolidated exchange entitlement.
const validTicker=t=>typeof t==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(t);
export const MAX_QUOTE_AGE_MS=180000;
export const QUOTE_REFRESH_MS=60000;
export const QUOTE_MAX_TICKERS=30;
function nyDate(time){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(time);
}
export function parseFinnhubQuote(ticker,raw,now=Date.now()){
 if(!validTicker(ticker)||typeof raw?.c!=='number'||!Number.isFinite(raw.c)||raw.c<=0||!Number.isInteger(raw.t)||raw.t<=0)return null;
 const at=raw.t*1000,age=now-at;
 if(age< -10000||age>MAX_QUOTE_AGE_MS)return null;
 return {ticker,close:raw.c,currency:'USD',date:nyDate(at),quoteTime:at,source:'FINNHUB_PERSONAL',kind:'current_quote'};
}
export function effectivePortfolioPrices(closes,quotes,now=Date.now()){
 const result=new Map(closes);
 for(const [ticker,q] of quotes){
  const old=closes.get(ticker);
  if(!validTicker(ticker)||q?.ticker!==ticker||q?.kind!=='current_quote'||q.source!=='FINNHUB_PERSONAL'||q.currency!=='USD'||!Number.isFinite(q.close)||q.close<=0||!Number.isFinite(q.quoteTime)||now-q.quoteTime>MAX_QUOTE_AGE_MS||q.quoteTime>now+10000||q.date!==nyDate(q.quoteTime)||old?.date>q.date)continue;
  result.set(ticker,q);
 }
 return result;
}
export async function fetchPersonalQuotes({tickers,key,fetcher=globalThis.fetch,now=Date.now,signal}){
 if(typeof key!=='string'||!(/^[A-Za-z0-9_-]{10,128}$/.test(key)))throw Error('개인 API 키 형식 확인 필요');
 const list=[...new Set(tickers)].filter(validTicker);
 if(list.length>QUOTE_MAX_TICKERS)throw Error('개인 시세 조회는 최대 30종목까지 지원합니다.');
 const quotes=new Map(),errors=[];
 for(let i=0;i<list.length;i+=4){
  if(signal?.aborted)throw Error('조회 취소');
  const group=await Promise.all(list.slice(i,i+4).map(async ticker=>{
   try{
    const response=await fetcher('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(ticker),{headers:{'X-Finnhub-Token':key},credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal});
    if(!response.ok)return {ticker,error:'HTTP '+response.status};
    const q=parseFinnhubQuote(ticker,await response.json(),now());
    return q?{ticker,q}:{ticker,error:'신규 시세 미확인'};
   }catch{return {ticker,error:'연결 실패'};}
  }));
  for(const item of group)if(item.q)quotes.set(item.ticker,item.q);else errors.push(item);
  if(group.some(x=>x.error==='HTTP 429'||x.error==='HTTP 401'||x.error==='HTTP 403'))break;
 }
 return {quotes,errors};
}
export function formatPortfolioNumber(n,decimals=0){
 return typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}):'—';
}
