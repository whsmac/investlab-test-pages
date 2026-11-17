import test from "node:test";
import assert from "node:assert/strict";
import {buildYahooLatestPrices} from "../src/market/yahoo-latest-prices.mjs";
const tickers=["MSFT","GOOGL","AMZN","META","TSLA"];
function snapshot(date="2026-11-16"){
 const observations=tickers.map((ticker,i)=>({ticker,trading_date:date,
   close_price:String(100+i),currency:"USD",price_basis:"unadjusted_close"}));
 return {mode:"REVIEW_ONLY",source:"Yahoo Finance",database_insert_authorized:false,
   writes_performed:0,row_count:observations.length,observations,published_at:"2026-11-17T00:00:00Z"};
}
test("fresh read-only prices are available to TEST UI without being labeled live",()=>{
 const result=buildYahooLatestPrices(snapshot(),{now:new Date("2026-11-17T08:00:00Z")});
 assert.equal(result.overallStatus,"current");
 assert.equal(result.prices.length,5);
 assert.deepEqual(result.prices.map(x=>x.price),[100,101,102,103,104]);
 assert.ok(result.prices.every(x=>x.isLive===false&&x.currency==="USD"));
});
test("stale price is blocked rather than reused for valuation",()=>{
 const result=buildYahooLatestPrices(snapshot("2026-10-01"),{now:new Date("2026-11-17T08:00:00Z")});
 assert.equal(result.overallStatus,"stale");
 assert.ok(result.prices.every(x=>x.price===null&&x.status==="stale"));
});
test("future dates are blocked",()=>{
 const result=buildYahooLatestPrices(snapshot("2026-11-18"),{now:new Date("2026-11-17T08:00:00Z")});
 assert.equal(result.overallStatus,"unavailable");
 assert.ok(result.prices.every(x=>x.price===null&&x.status==="future"));
});
test("unapproved write-enabled source is rejected",()=>{
 assert.throws(()=>buildYahooLatestPrices({...snapshot(),writes_performed:1}),/Invalid read-only Yahoo/);
});
