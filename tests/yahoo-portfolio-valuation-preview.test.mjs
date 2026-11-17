import test from "node:test";
import assert from "node:assert/strict";
import {previewYahooPortfolioValuation} from "../src/ledger/yahoo-portfolio-valuation-preview.mjs";
const now=new Date("2026-11-17T08:00:00Z");
function snapshot(day="2026-11-16"){
 const observations=["MSFT","GOOGL","AMZN","META","TSLA"].map((ticker,i)=>({
  ticker,trading_date:day,close_price:String(100+i),currency:"USD",price_basis:"unadjusted_close"
 }));
 return {mode:"REVIEW_ONLY",source:"Yahoo Finance",database_insert_authorized:false,writes_performed:0,
 row_count:observations.length,observations};
}
const holdings=[{ticker:"TSLA",quantityDisplay:"2"}];
const accounts=[{accountId:"a",name:"TEST",holdings:[{ticker:"TSLA",quantityDisplay:"2",averageCostUsd:"80"}]}];
test("fresh Yahoo price fills empty assumption and computes portfolio valuation without writes",()=>{
 const input={snapshot:snapshot(),holdings,accounts,assumedPrices:{},now};
 const result=previewYahooPortfolioValuation(input);
 assert.equal(result.fill.updates.TSLA,104);
 assert.equal(result.valuation.totalMarketValueUsd,208);
 assert.equal(result.valuation.totalUnrealizedPnlUsd,48);
 assert.equal(result.canPersist,false);
 assert.deepEqual(input.assumedPrices,{});
});
test("existing user price remains authoritative in valuation",()=>{
 const result=previewYahooPortfolioValuation({snapshot:snapshot(),holdings,accounts,assumedPrices:{TSLA:150},now});
 assert.deepEqual(result.fill.updates,{});
 assert.equal(result.valuation.totalMarketValueUsd,300);
 assert.equal(result.valuation.totalUnrealizedPnlUsd,140);
});
test("stale Yahoo price does not produce a fabricated portfolio total",()=>{
 const result=previewYahooPortfolioValuation({snapshot:snapshot("2026-09-01"),holdings,accounts,now});
 assert.equal(result.valuation.totalMarketValueUsd,null);
 assert.equal(result.fill.skipped[0].reason,"PRICE_UNAVAILABLE");
});
test("missing cost basis leaves market value but not total unrealized profit",()=>{
 const result=previewYahooPortfolioValuation({snapshot:snapshot(),holdings,
 accounts:[{accountId:"a",name:"TEST",holdings:[{ticker:"TSLA",quantityDisplay:"2"}]}],now});
 assert.equal(result.valuation.totalMarketValueUsd,208);
 assert.equal(result.valuation.totalUnrealizedPnlUsd,null);
});
