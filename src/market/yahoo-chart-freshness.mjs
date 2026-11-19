// Data age is measured from the newest trading day, not the publication timestamp.
// Weekend/holiday gaps are tolerated up to seven calendar days.
export function assessYahooChartFreshness(snapshot,{now=new Date(),maxAgeDays=7}={}){
 if(snapshot?.mode!=="REVIEW_ONLY"||snapshot?.source!=="Yahoo Finance"||
    snapshot.database_insert_authorized!==false||snapshot.writes_performed!==0||
    !Array.isArray(snapshot.observations)||snapshot.row_count!==snapshot.observations.length)
   throw Error("Invalid read-only Yahoo freshness source");
 const current=new Date(now);
 if(!Number.isFinite(current.getTime())||!Number.isSafeInteger(maxAgeDays)||maxAgeDays<1||maxAgeDays>30)
   throw Error("Invalid freshness parameters");
 const today=Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),current.getUTCDate());
 const tickers=["MSFT","GOOGL","AMZN","META","TSLA"];
 if(snapshot.observations.some(r=>r.ticker==="SPCX"))tickers.push("SPCX");
 const dates=Object.fromEntries(tickers.map(t=>[t,null]));
 for(const row of snapshot.observations){
  if(!Object.hasOwn(dates,row.ticker))continue;
  const value=row.trading_date;
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)||
     new Date(value+"T00:00:00Z").toISOString().slice(0,10)!==value)
   throw Error("Invalid Yahoo trading date");
  if(dates[row.ticker]===null||value>dates[row.ticker])dates[row.ticker]=value;
 }
 const details=tickers.map(ticker=>{
  const date=dates[ticker],ageDays=date===null?null:Math.round((today-Date.parse(date+"T00:00:00Z"))/86400000);
  return {ticker,lastTradingDate:date,ageDays,status:ageDays===null?"missing":ageDays<0?"future":ageDays>maxAgeDays?"stale":"current"};
 });
 const status=details.some(x=>x.status==="missing"||x.status==="future")?"unavailable":
              details.some(x=>x.status==="stale")?"stale":"current";
 return {status,maxAgeDays,details,publishedAt:typeof snapshot.published_at==="string"?snapshot.published_at:null};
}
