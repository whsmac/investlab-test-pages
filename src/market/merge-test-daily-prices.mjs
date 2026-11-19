// INVESTLAB TEST: merge same-origin, read-only published daily closes with TEST history.
// Never overwrite an existing trading date or treat an unofficial close as a live quote.
const ALLOWED=new Set(["MSFT","GOOGL","AMZN","META","TSLA"]);
const DATE=/^\d{4}-\d{2}-\d{2}$/;
export function mergeTestDailyPrices(knownSeries,review,{from="0000-00-00",today=new Date(),maxAgeDays=7}={}){
 if(!(knownSeries instanceof Map))throw Error("기존 주가 자료 오류");
 if(review?.mode!=="REVIEW_ONLY"||review?.source!=="Yahoo Finance"||
    review.database_insert_authorized!==false||review.writes_performed!==0||
    !Array.isArray(review.observations)||review.row_count!==review.observations.length||
    review.row_count>10000)throw Error("TEST Yahoo 주가 파일 검증 실패");
 if(!DATE.test(from)||!Number.isInteger(maxAgeDays)||maxAgeDays<1||maxAgeDays>14)throw Error("조회기간 오류");
 const now=new Date(today);
 if(!Number.isFinite(now.getTime()))throw Error("기준일 오류");
 const todayMs=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 const incoming=new Map([...ALLOWED].map(t=>[t,[]]));
 for(const row of review.observations){
  if(!ALLOWED.has(row?.ticker))continue;
  const stamp=Date.parse(String(row.trading_date)+"T00:00:00Z");
  if(!DATE.test(row.trading_date)||!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==row.trading_date||
     stamp>todayMs||row.currency!=="USD"||row.price_basis!=="unadjusted_close")throw Error("TEST 주가 날짜·통화·기준 검증 실패");
  const price=Number(row.close_price);
  if(!Number.isFinite(price)||price<=0)throw Error("TEST 종가 값 오류");
  if(row.trading_date>=from)incoming.get(row.ticker).push({date:row.trading_date,close:price});
 }
 const series=new Map(knownSeries),sourceCounts={},latestDates={};
 for(const [ticker,rows] of incoming){
  const base=Array.isArray(knownSeries.get(ticker))?knownSeries.get(ticker):[];
  const dates=new Map(base.map(row=>[row.date,row]));
  const latest=rows.reduce((last,r)=>r.date>last?r.date:last,"");
  latestDates[ticker]=latest||null;
  if(latest&&Math.round((todayMs-Date.parse(latest+"T00:00:00Z"))/86400000)<=maxAgeDays){
   let count=0;
   for(const item of rows){
    if(dates.has(item.date))continue;
    dates.set(item.date,item);count++;
   }
   sourceCounts[ticker]=count;
   series.set(ticker,[...dates.values()].sort((a,b)=>a.date.localeCompare(b.date)));
  }else{
   sourceCounts[ticker]=0;
   series.set(ticker,base);
  }
 }
 return {series,sourceCounts,latestDates,appended:Object.values(sourceCounts).reduce((a,b)=>a+b,0)};
}
