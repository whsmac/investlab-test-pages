// Public-only ETF market closes. No portfolio information leaves this browser.
// Same-origin validated TEST JSON, never contacts Yahoo directly from a user session.
export const ETF_SYMBOLS=Object.freeze(["BITU","TQQQ","USD"]);
export function parsePublishedEtfCloses(payload,{now=new Date(),maxAgeDays=7}={}){
 if(!payload||typeof payload!=="object"||Object.keys(payload).sort().join(",")!=="database_writes,generated_on,mode,quote_count,quotes,source,writes_performed"
  ||payload.mode!=="PILOT_ETF_CLOSING_QUOTES_V1"||payload.source!=="Yahoo Finance"
  ||payload.database_writes!==0||payload.writes_performed!==0
  ||payload.quote_count!==3||!Array.isArray(payload.quotes)||payload.quotes.length!==3)
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
 if(result.size!==ETF_SYMBOLS.length)throw Error("ETF 종가가 모두 확보되지 않았습니다");
 return result;
}
export async function loadPublishedEtfCloses({origin,fetcher=fetch,now=new Date()}={}){
 if(!origin)throw Error("TEST 페이지 주소가 없습니다");
 const base=new URL(origin);
 if(base.protocol!=="https:"||base.hostname!=="whsmac.github.io"||
  !base.pathname.startsWith("/investlab-test-pages/"))throw Error("허용되지 않은 TEST 호스트");
 const url=new URL("./data/portfolio-etf-quotes.json",base);
 if(url.origin!==base.origin||url.pathname!=="/investlab-test-pages/data/portfolio-etf-quotes.json")
  throw Error("허용되지 않은 ETF 공개파일 경로");
 const response=await fetcher(url.href,{cache:"no-store",credentials:"omit",redirect:"error"});
 if(!response.ok)throw Error("ETF 공개종가 조회 HTTP "+response.status);
 if(!String(response.headers?.get?.("content-type")||"").toLowerCase().includes("json"))
  throw Error("ETF 공개종가 파일 형식 오류");
 return parsePublishedEtfCloses(await response.json(),{now});
}
