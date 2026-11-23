// TEST Pilot market-trends: all data is public daily close, no database calls.
export const MARKET_INDICATORS=Object.freeze([
 {ticker:"^TNX",title:"미국 10년물 국채금리",unit:"%",divisor:10,decimals:2},
 {ticker:"GC=F",title:"금 선물",unit:"USD/트로이온스",divisor:1,decimals:0},
 {ticker:"CL=F",title:"WTI 원유 선물",unit:"USD/배럴",divisor:1,decimals:2}
]);
export const MARKET_SECTORS=Object.freeze([
 {ticker:"XLK",name:"기술",stocks:[["AAPL","Apple",7],["MSFT","Microsoft",7],["NVDA","NVIDIA",7],["AVGO","Broadcom",4]]},
 {ticker:"XLF",name:"금융",stocks:[["JPM","JPMorgan",6],["BAC","Bank of America",4]]},
 {ticker:"XLE",name:"에너지",stocks:[["XOM","Exxon Mobil",7],["CVX","Chevron",4]]},
 {ticker:"XLI",name:"산업재",stocks:[["CAT","Caterpillar",4],["GE","GE Aerospace",4]]},
 {ticker:"XLY",name:"임의소비재",stocks:[["AMZN","Amazon",7],["TSLA","Tesla",5]]},
 {ticker:"XLP",name:"필수소비재",stocks:[["WMT","Walmart",6],["COST","Costco",5]]},
 {ticker:"XLV",name:"헬스케어",stocks:[["LLY","Eli Lilly",6],["JNJ","Johnson & Johnson",5]]},
 {ticker:"XLC",name:"커뮤니케이션",stocks:[["META","Meta",7],["GOOGL","Alphabet",7]]},
 {ticker:"XLU",name:"유틸리티",stocks:[["NEE","NextEra Energy",4],["DUK","Duke Energy",3]]},
 {ticker:"XLB",name:"소재",stocks:[["LIN","Linde",5],["SHW","Sherwin-Williams",3]]},
 {ticker:"XLRE",name:"부동산",stocks:[["PLD","Prologis",4],["AMT","American Tower",3]]}
]);
export const MARKET_SYMBOLS=new Set([...MARKET_INDICATORS.map(v=>v.ticker),
 ...MARKET_SECTORS.flatMap(s=>[s.ticker,...s.stocks.map(t=>t[0])])]);
const ISO=/^\d{4}-\d{2}-\d{2}$/;
export function parseMarketTrendsReport(payload,{today=new Date(),maxAgeDays=7}={}){
 if(payload?.mode!=="MARKET_TRENDS_REVIEW_ONLY"||payload.source!=="Yahoo Finance"||
 payload.database_writes!==0||payload.writes_performed!==0||
 !Array.isArray(payload.observations)||payload.row_count!==payload.observations.length||
 payload.row_count<1||payload.row_count>20000)throw Error("시장 동향 자료 검증 실패");
 const now=new Date(today),todayMs=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 if(!Number.isFinite(todayMs))throw Error("기준일 오류");
 const results=new Map(),seen=new Set();
 for(const r of payload.observations){
  const ms=Date.parse(String(r.trading_date)+"T00:00:00Z"),v=Number(r.close_price),name=r.ticker;
  if(!MARKET_SYMBOLS.has(name)||r.source_symbol!==name||!ISO.test(r.trading_date)||
   !Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==r.trading_date||ms>todayMs||
   r.currency!=="USD"||r.price_basis!=="unadjusted_close"||!Number.isFinite(v)||v<=0)
    throw Error("시장 동향 거래일·가격·출처 검증 실패");
  const id=name+"@"+r.trading_date;
  if(seen.has(id))throw Error("시장 동향 중복 거래일");
  seen.add(id);
  if(!results.has(name))results.set(name,[]);
  results.get(name).push({date:r.trading_date,close:v});
 }
 for(const rows of results.values())rows.sort((a,b)=>a.date.localeCompare(b.date));
 const stale=new Set([...results].filter(([,rows])=>todayMs-Date.parse(rows.at(-1).date+"T00:00:00Z")>maxAgeDays*86400000).map(([name])=>name));
 return {series:results,stale,generatedOn:payload.generated_on||"",source:payload.source};
}
export function periodChange(rows,sessions=1){
 if(!Array.isArray(rows)||rows.length<2||rows.length<=sessions)return null;
 const recent=rows.at(-1).close,old=rows[rows.length-1-sessions].close;
 if(!(old>0)||!Number.isFinite(recent))return null;
 return (recent/old-1)*100;
}
export function indicatorHistory(rows,sessionCount,divisor=1){
 if(!Array.isArray(rows)||!(divisor>0))return [];
 return rows.slice(-sessionCount).filter(p=>Number.isFinite(p.close)&&p.close>0)
  .map(p=>({date:p.date,value:p.close/divisor}));
}
export function heatColor(change){
 if(!Number.isFinite(change))return "#354158";
 const n=Math.min(Math.abs(change)/8,1);
 if(change>=0)return "rgb("+Math.round(24-5*n)+","+Math.round(75+95*n)+","+Math.round(65+20*n)+")";
 return "rgb("+Math.round(105+105*n)+","+Math.round(48-20*n)+","+Math.round(65-5*n)+")";
}
