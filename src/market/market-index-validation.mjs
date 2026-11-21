// No ETF substitution, no cross-origin requests and no interpolation.
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const EXPECTED={NDX:"^NDX",SPX:"^GSPC"};
export function validateMarketBenchmarkReport(payload,{today=new Date(),maxAgeDays=7}={}){
 if(payload?.mode!=="BENCHMARK_REVIEW_ONLY"||payload.source!=="Yahoo Finance"||
  payload.database_writes!==0||payload.writes_performed!==0||
  !Array.isArray(payload.observations)||payload.row_count!==payload.observations.length||
  payload.row_count>6000||payload.row_count<1)throw Error("시장지수 파일 형식 오류");
 const now=new Date(today),todayMs=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 if(!Number.isFinite(todayMs))throw Error("시장지수 검증 날짜 오류");
 const map=new Map([["NDX",[]],["SPX",[]]]),seen=new Set();
 for(const r of payload.observations){
  const ms=Date.parse(String(r.date)+"T00:00:00Z");
  if(!Object.hasOwn(EXPECTED,r.ticker)||r.source_symbol!==EXPECTED[r.ticker]||
   !ISO.test(r.date)||!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==r.date||
   ms>todayMs||r.unit!=="index_points"||r.currency!=="USD"||
   r.price_basis!=="index_close"||!Number.isFinite(Number(r.close))||Number(r.close)<=0)
   throw Error("시장지수 날짜·수치·출처 검증 실패");
  const key=r.ticker+"@"+r.date;
  if(seen.has(key))throw Error("시장지수 거래일 중복");
  seen.add(key);map.get(r.ticker).push({date:r.date,close:Number(r.close)});
 }
 for(const [ticker,rows] of map){
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  if(rows.length<20)throw Error(ticker+" 데이터 부족");
  if(todayMs-Date.parse(rows.at(-1).date+"T00:00:00Z")>maxAgeDays*86400000)
   throw Error(ticker+" 시장지수 자료가 오래되었습니다.");
 }
 return map;
}
