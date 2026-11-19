import test from "node:test";
import assert from "node:assert/strict";
import {assessYahooChartFreshness} from "../src/market/yahoo-chart-freshness.mjs";
const tickers=["MSFT","GOOGL","AMZN","META","TSLA"];
const snapshot=(date)=>({mode:"REVIEW_ONLY",source:"Yahoo Finance",database_insert_authorized:false,writes_performed:0,row_count:5,observations:tickers.map(ticker=>({ticker,trading_date:date}))});
test("weekend age within seven days is current",()=>{
 const result=assessYahooChartFreshness(snapshot("2026-11-13"),{now:new Date("2026-11-16T12:00:00Z")});
 assert.equal(result.status,"current");assert.equal(result.details[0].ageDays,3);
});
test("stale data is flagged, not presented as current",()=>{
 const result=assessYahooChartFreshness(snapshot("2026-11-01"),{now:new Date("2026-11-16T12:00:00Z")});
 assert.equal(result.status,"stale");
});
test("future and missing ticker dates are unavailable",()=>{
 const future=assessYahooChartFreshness(snapshot("2026-11-17"),{now:new Date("2026-11-16T12:00:00Z")});
 assert.equal(future.status,"unavailable");
 const missing=snapshot("2026-11-13");missing.observations.pop();missing.row_count=4;
 assert.equal(assessYahooChartFreshness(missing,{now:new Date("2026-11-16T12:00:00Z")}).status,"unavailable");
});
test("never trust writable data",()=>{
 assert.throws(()=>assessYahooChartFreshness({...snapshot("2026-11-13"),writes_performed:1}),/Invalid/);
});
