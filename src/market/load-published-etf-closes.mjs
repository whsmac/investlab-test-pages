// Public-only ETF market closes. No portfolio information leaves this browser.
// Same-origin validated TEST JSON, never contacts Yahoo directly from a user session.
export const ETF_SYMBOLS=Object.freeze(["BITU","TQQQ","USD","QLD"]);
export function parsePublishedEtfCloses(payload,{now=new Date(),maxAgeDays=7}={}){
 if(!payload||typeof payload!=="object"||Object.keys(payload).sort().join(",")!=="database_writes,generated_on,mode,quote_count,quotes,source,writes_performed"
  ||payload.mode!=="PILOT_ETF_CLOSING_QUOTES_V1"||payload.source!=="Yahoo Finance"
  ||payload.database_writes!==0||payload.writes_performed!==0
  ||!Array.isArray(payload.quotes)||payload.quote_count!==payload.quotes.length||![3,4].includes(payload.quote_count))
  throw Error("ETF 공개시세 데이터 검증 실패");
 const stamp=Date.parse(payload.generated_on+"T00:00:00Z"),current=new Date(now);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(payload.generated_on)||!Number.isFinite(stamp)||
  !Number.isFinite(current.getTime())||(Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),current.getUTCDate())-stamp)<0||
  (Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),current.getUTCDate())-stamp)>7*86400000)
  throw Error("ETF 시세 게시일 오류");
 if(!Number.isSafeInteger(maxAgeDays)||maxAgeDays<1||maxAgeDays>14)throw Error("ETF 시세 허용기간 오류");
 const result=new Map();
 for(const row of payload.quotes){
  if(!row||typeof row!=="object"||Object.keys(row).sort().join(",")!=="close_price,currency,price_basis,ticker,trading_date")
   throw Error("ETF 시세에 허용되지 않은 필드가 있습니다");
  if(!ETF_SYMBOLS.includes(row.ticker)||result.has(row.ticker)||
   row.currency!=="USD"||row.price_basis!=="unadjusted_close"||
   !/^\d{4}-\d{2}-\d{2}$/.test(row.trading_date))
   throw Error("ETF 종목·통화 또는 거래일 오류");
  const day=Date.parse(row.trading_date+"T00:00:00Z"),age=Math.round((Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),current.getUTCDate())-day)/86400000);
  const close=Number(row.close_price);
  if(!Number.isFinite(day)||!Number.isFinite(close)||close<=0||close>100000||age<0||age>maxAgeDays)
   throw Error(row.ticker+" ETF 종가가 없거나 최신 자료가 아닙니다");
  result.set(row.ticker,{date:row.trading_date,close,currency:"USD",source:"YAHOO_ETF_TEST"});
 }
 if(!["BITU","TQQQ","USD"].every(t=>result.has(t))||result.size!==payload.quote_count)throw Error("ETF 종가가 모두 확보되지 않았습니다");
 return result;
}
// The historical public asset is independently collected; use only recent
// verified as-traded USD closing prices. No forward fill or invented values.
export function latestPublicHistoryCloses(payload,{now=new Date(),maxAgeDays=7}={}){
 if(payload?.format!=='PILOT_PUBLIC_HISTORY_V1'||payload.source!=='Yahoo Finance / Federal Reserve H.10 DEXKOUS'||payload.database_writes!==0||!Array.isArray(payload.rows)||payload.rows.length>12000)throw Error('공개 과거 시세 형식 오류');
 const today=new Date(now).toISOString().slice(0,10),stamp=Date.parse(today+'T00:00:00Z'),allowed=new Set(['BITU','TQQQ','USD','QLD','SOXL','TSLL','PLTR','TSLA']),out=new Map(),seen=new Set();
 for(const row of payload.rows){
  if(!allowed.has(row.ticker))continue;
  const date=row.date,close=row.as_traded_close,factor=row.split_factor,adjusted=row.close;
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z')))continue;
  const age=(stamp-Date.parse(date+'T00:00:00Z'))/86400000,key=row.ticker+'|'+date;
  if(seen.has(key))throw Error('공개 시세 중복');seen.add(key);
  if(age<0||age>maxAgeDays||!Number.isFinite(close)||close<=0||close>100000||!Number.isFinite(adjusted)||adjusted<=0||!Number.isFinite(factor)||factor<=0||Math.abs(close-adjusted*factor)>Math.max(1e-7,close*1e-8))continue;
  if(!out.has(row.ticker)||out.get(row.ticker).date<date)out.set(row.ticker,{date,close,currency:'USD',source:'YAHOO_PUBLIC_HISTORY'});
 }
 return out;
}
export async function loadPublishedEtfCloses({origin,fetcher=fetch,now=new Date()}={}){
 if(!origin)throw Error('TEST 페이지 주소가 없습니다');
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.hostname!=='whsmac.github.io'||!base.pathname.startsWith('/investlab-test-pages/'))throw Error('허용되지 않은 TEST 호스트');
 async function read(file){const url=new URL('./data/'+file,base);if(url.origin!==base.origin||url.pathname!=='/investlab-test-pages/data/'+file)throw Error('허용되지 않은 공개파일 경로');const response=await fetcher(url.href,{cache:'no-store',credentials:'omit',redirect:'error'});if(!response.ok)throw Error('공개시세 조회 HTTP '+response.status);if(!String(response.headers?.get?.('content-type')||'').toLowerCase().includes('json'))throw Error('공개시세 파일 형식 오류');return response.json()}
 const sources=await Promise.allSettled([read('portfolio-etf-quotes.json').then(p=>parsePublishedEtfCloses(p,{now})),read('portfolio-public-history.json').then(p=>latestPublicHistoryCloses(p,{now}))]);
 const out=new Map();for(const result of sources)if(result.status==='fulfilled')for(const [ticker,q] of result.value)if(!out.has(ticker)||out.get(ticker).date<q.date)out.set(ticker,q);
 if(!out.size)throw Error('유효한 ETF 공개종가 없음');
 return out;
}
