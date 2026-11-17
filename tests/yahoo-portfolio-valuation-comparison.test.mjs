import test from "node:test";
import assert from "node:assert/strict";
import {compareYahooPortfolioValuation} from "../src/ledger/yahoo-portfolio-valuation-comparison.mjs";
const now=new Date("2026-11-17T08:00:00Z");
function snapshot(day="2026-11-16"){
 const observations=["MSFT","GOOGL","AMZN","META","TSLA"].map((ticker,i)=>({
  ticker,trading_date:day,close_price:String(100+i),currency:"USD",price_basis:"unadjusted_close"
 }));
 return {mode:"REVIEW_ONLY",source:"Yahoo Finance",database_insert_authorized:false,writes_performed:0,row_count:observations.length,observations};
}
const holdings=[{ticker:"TSLA",quantityDisplay:"2"}];
const accounts=[{accountId:"a",name:"TEST",holdings:[{ticker:"TSLA",quantityDisplay:"2",averageCostUsd:"80"}]}];
test("empty price uses fresh Yahoo without mutating caller input",()=>{
 const assumedPrices={};
 const result=compareYahooPortfolioValuation({snapshot:snapshot(),holdings,accounts,assumedPrices,now});
 assert.equal(result.existing.totalMarketValueUsd,null);
 assert.equal(result.latest.totalMarketValueUsd,208);
 assert.equal(result.totalDifferenceUsd,null);
 assert.equal(result.rows[0].source,"YAHOO_LATEST_CLOSE");
 assert.equal(result.rows[0].tradingDate,"2026-11-16");
 assert.deepEqual(assumedPrices,{});
 assert.equal(result.canPersist,false);
});
test("user assumptions are preserved and source clearly labelled",()=>{
 const result=compareYahooPortfolioValuation({snapshot:snapshot(),holdings,accounts,assumedPrices:{TSLA:"150"},now});
 assert.equal(result.rows[0].source,"USER_ASSUMPTION");
 assert.equal(result.latest.totalMarketValueUsd,300);
 assert.equal(result.totalDifferenceUsd,0);
});
test("stale price is marked unavailable, never treated as current",()=>{
 const result=compareYahooPortfolioValuation({snapshot:snapshot("2026-09-01"),holdings,accounts,now});
 assert.equal(result.rows[0].source,"PRICE_UNAVAILABLE");
 assert.equal(result.latest.totalMarketValueUsd,null);
});

test("latest-close preview overrides only calculation, never the saved user price",()=>{
 const assumedPrices={TSLA:"150"};
 const result=compareYahooPortfolioValuation({snapshot:snapshot(),holdings,accounts,assumedPrices,priceMode:"latest-close",now});
 assert.equal(result.priceMode,"latest-close");
 assert.equal(result.rows[0].source,"YAHOO_LATEST_CLOSE");
 assert.equal(result.existing.totalMarketValueUsd,300);
 assert.equal(result.latest.totalMarketValueUsd,208);
 assert.equal(result.totalDifferenceUsd,-92);
 assert.deepEqual(assumedPrices,{TSLA:"150"});
 assert.equal(result.canPersist,false);
});
test("invalid price mode is rejected",()=>{
 assert.throws(()=>compareYahooPortfolioValuation({snapshot:snapshot(),holdings,accounts,priceMode:"unknown",now}),/Invalid price mode/);
});
