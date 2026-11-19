// Read-only, opt-in transfer of fresh Yahoo TEST review prices into portfolio assumptions.
// Never overwrites existing user-entered assumptions unless explicitly requested.
import {buildYahooLatestPrices} from "../market/yahoo-latest-prices.mjs";

export function previewYahooPortfolioPriceFill(snapshot,holdings,assumedPrices={},options={}){
 if(!Array.isArray(holdings)||!assumedPrices||typeof assumedPrices!=="object"||Array.isArray(assumedPrices))
   throw Error("Invalid portfolio holdings or assumptions");
 const {overwrite=false,now=new Date()}=options;
 if(typeof overwrite!=="boolean")throw Error("Invalid overwrite option");
 const feed=buildYahooLatestPrices(snapshot,{now});
 const available=new Map(feed.prices.map(row=>[row.ticker,row]));
 const updates={};const updateDates={};const skipped=[];const seen=new Set();
 for(const holding of holdings){
  const ticker=String(holding?.ticker||"").trim().toUpperCase();
  if(!/^[A-Z0-9.^-]{1,16}$/.test(ticker)||seen.has(ticker))throw Error("Invalid or duplicate portfolio ticker");
  seen.add(ticker);
  const source=available.get(ticker);
  if(!source){skipped.push({ticker,reason:"UNSUPPORTED_TICKER"});continue;}
  if(source.price===null){skipped.push({ticker,reason:"PRICE_UNAVAILABLE"});continue;}
  const existing=assumedPrices[ticker];
  if(!overwrite&&existing!==undefined&&existing!==null&&String(existing).trim()!==""){
    skipped.push({ticker,reason:"USER_PRICE_PRESERVED"});continue;
  }
  updates[ticker]=source.price;
  updateDates[ticker]=source.tradingDate;
 }
 return {mode:"TEST_PRICE_FILL_PREVIEW",source:"Yahoo Finance (TEST REVIEW_ONLY)",
   isLive:false,canPersist:false,updates,updateDates,skipped,feedStatus:feed.overallStatus};
}
