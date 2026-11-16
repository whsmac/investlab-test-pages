// Pure, read-only chart series derived from published Yahoo REVIEW_ONLY data.
const TICKERS=["MSFT","GOOGL","AMZN","META","TSLA"];
export function buildYahooChartSeries(snapshot,{limit=90}={}){
 if(snapshot?.mode!=="REVIEW_ONLY" || snapshot?.source!=="Yahoo Finance" ||
    snapshot.database_insert_authorized!==false || snapshot.writes_performed!==0 ||
    !Array.isArray(snapshot.observations) || snapshot.row_count!==snapshot.observations.length)
   throw Error("Invalid read-only Yahoo chart source");
 if(!Number.isSafeInteger(limit)||limit<2||limit>365)throw Error("Invalid chart limit");
 const groups=Object.fromEntries(TICKERS.map(t=>[t,[]]));
 const seen=new Set();
 for(const row of snapshot.observations){
   if(!Object.hasOwn(groups,row.ticker))continue;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(row.trading_date)||!Number.isFinite(Date.parse(row.trading_date+"T00:00:00Z")))
     throw Error("Invalid trading date");
   const price=Number(row.close_price);
   if(!Number.isFinite(price)||price<=0||row.currency!=="USD"||row.price_basis!=="unadjusted_close")
     throw Error("Invalid Yahoo price basis");
   const key=row.ticker+"|"+row.trading_date;
   if(seen.has(key))throw Error("Duplicate Yahoo chart date");
   seen.add(key);
   groups[row.ticker].push({date:row.trading_date,close:price});
 }
 return TICKERS.map(ticker=>({ticker,points:groups[ticker].sort((a,b)=>a.date.localeCompare(b.date)).slice(-limit)}));
}
