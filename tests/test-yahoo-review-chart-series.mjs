import test from "node:test";
import assert from "node:assert/strict";
import {buildYahooChartSeries} from "../src/market/yahoo-review-chart-series.mjs";
const row=(ticker,date,close_price)=>({ticker,trading_date:date,close_price,currency:"USD",price_basis:"unadjusted_close"});
const observations=[row("TSLA","2026-11-13",400),row("TSLA","2026-11-12",390),row("MSFT","2026-11-12",500)];
const source={mode:"REVIEW_ONLY",source:"Yahoo Finance",database_insert_authorized:false,writes_performed:0,row_count:3,observations};
test("chart series sorts by trading date and leaves source untouched",()=>{
 const before=JSON.stringify(source),series=buildYahooChartSeries(source);
 assert.deepEqual(series.find(s=>s.ticker==="TSLA").points.map(p=>p.close),[390,400]);
 assert.equal(JSON.stringify(source),before);
});
test("chart source must be review-only and non-writing",()=>{
 assert.throws(()=>buildYahooChartSeries({...source,writes_performed:1}),/Invalid/);
});
test("duplicate ticker-date blocked",()=>{
 const bad={...source,observations:[...observations,observations[0]],row_count:4};
 assert.throws(()=>buildYahooChartSeries(bad),/Duplicate/);
});
test("invalid currency and price basis blocked",()=>{
 const bad={...source,observations:[{...observations[0],currency:"KRW"},...observations.slice(1)]};
 assert.throws(()=>buildYahooChartSeries(bad),/price basis/);
});
