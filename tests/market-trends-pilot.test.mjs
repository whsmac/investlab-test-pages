import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MARKET_INDICATORS,MARKET_SECTORS,MARKET_SYMBOLS,parseMarketTrendsReport,periodChange,indicatorHistory,heatColor} from "../src/market/market-trends-model.mjs";
import {loadPublishedMarketTrends} from "../src/market/load-published-market-trends.mjs";

const today=new Date("2026-11-23T00:00:00Z");
const rows=[...Array.from({length:260},(_,i)=>({ticker:"XLK",source_symbol:"XLK",trading_date:new Date(Date.UTC(2025,11,1+i)).toISOString().slice(0,10),close_price:String(100+i),currency:"USD",price_basis:"unadjusted_close"})),
 ...Array.from({length:35},(_,i)=>({ticker:"^TNX",source_symbol:"^TNX",trading_date:new Date(Date.UTC(2026,9,20+i)).toISOString().slice(0,10),close_price:"42.4",currency:"USD",price_basis:"unadjusted_close"}))];
const fresh=rows.filter(r=>r.trading_date<="2026-11-23");
const report={mode:"MARKET_TRENDS_REVIEW_ONLY",source:"Yahoo Finance",database_writes:0,writes_performed:0,generated_on:"2026-11-23",observations:fresh,row_count:fresh.length};
test("market trends modules keep 3 official indicators and 11 existing sectors",()=>{
 assert.deepEqual(MARKET_INDICATORS.map(x=>x.ticker),["^TNX","GC=F","CL=F"]);
 assert.equal(MARKET_SECTORS.length,11);
 assert.ok(MARKET_SYMBOLS.has("XLRE"));
 assert.ok(MARKET_SYMBOLS.has("TSLA"));
});
test("read-only public data validates dates values origin and freshness",()=>{
 const p=parseMarketTrendsReport(report,{today});
 assert.equal(p.series.get("XLK").length,260);
 assert.equal(p.series.get("^TNX").length,35);
 assert.equal(p.stale.size,0);
 assert.throws(()=>parseMarketTrendsReport({...report,database_writes:1},{today}),/검증/);
 const bad={...report,observations:report.observations.slice()};
 bad.observations[0]={...bad.observations[0],source_symbol:"XLV"};
 assert.throws(()=>parseMarketTrendsReport(bad,{today}),/출처/);
});
test("returns use close changes, yields convert ^TNX to percent",()=>{
 const data=parseMarketTrendsReport(report,{today});
 assert.ok(periodChange(data.series.get("XLK"),21)>0);
 assert.equal(periodChange(data.series.get("XLK"),260),null);
 assert.deepEqual(indicatorHistory(data.series.get("^TNX"),5,10).map(x=>x.value),[4.24,4.24,4.24,4.24,4.24]);
 assert.equal(heatColor(null),"#354158");
});
test("strict same-origin market data fetch and correct response MIME",async()=>{
 const seen=[];
 const parsed=await loadPublishedMarketTrends({origin:"https://whsmac.github.io/investlab-test-pages/market-trends.html",today,
  fetcher:async(url,options)=>{seen.push([url,options.credentials]);return {ok:true,headers:{get:()=>"application/json"},json:async()=>report};}});
 assert.ok(parsed.series.has("XLK"));
 assert.deepEqual(seen,[["https://whsmac.github.io/investlab-test-pages/data/market-trends-public-review.json","omit"]]);
 await assert.rejects(()=>loadPublishedMarketTrends({origin:"https://evil.example.com/investlab-test-pages/market-trends.html"}),/허용되지/);
});
test("Pilot has new module not duplicate embedded dashboard charts",()=>{
 const home=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const page=readFileSync(new URL("../market-trends.html",import.meta.url),"utf8");
 assert.match(home,/href="\.\/market-trends\.html"/);
 assert.match(page,/id="indicatorGrid"/);
 assert.match(page,/id="sectorGrid"/);
 assert.match(page,/MARKET_SECTORS/);
 assert.doesNotMatch(home,/id="sectorGrid"/);
 assert.doesNotMatch(home,/id="indicatorGrid"/);
 for(const filename of ["my-portfolio.html","virtual-trade-simulator.html","company-investment-analysis.html","pilot-ledger.html","data-management.html"]){
  assert.match(readFileSync(new URL("../"+filename,import.meta.url),"utf8"),/href="\.\/market-trends\.html"/);
 }
});
