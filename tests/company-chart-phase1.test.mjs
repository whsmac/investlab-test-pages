import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPriceComparison,enrichQuarterlyFinance,closingExtrema,chartDateTicks} from "../src/market/company-chart-metrics.mjs";
import {validateMarketBenchmarkReport} from "../src/market/market-index-validation.mjs";
import {loadPublishedMarketIndices} from "../src/market/load-published-market-indices.mjs";

const point=(date,close)=>({date,close});
const companies=new Map([
 ["TSLA",[point("2026-01-05",200),point("2026-01-06",250),point("2026-01-07",225)]],
 ["MSFT",[point("2026-01-05",400),point("2026-01-06",420),point("2026-01-07",410)]]
]);
const indices=new Map([
 ["NDX",[point("2026-01-05",20000),point("2026-01-06",20500),point("2026-01-07",21000)]],
 ["SPX",[point("2026-01-05",6000),point("2026-01-06",6040),point("2026-01-07",6060)]]
]);
test("one and multiple companies stay in USD price mode until benchmarks selected",()=>{
 for(const active of [["TSLA"],["TSLA","MSFT"]]){
  const r=buildPriceComparison(active,companies,indices,"2026-01-05",[]);
  assert.equal(r.indexed,false);
  assert.equal(r.sets[0].points[0].value,200);
  if(active.length===2)assert.equal(r.sets[1].points[0].value,400);
 }
});
test("NASDAQ 100 and S&P 500 toggles normalize selected companies on the same baseline",()=>{
 const one=buildPriceComparison(["TSLA"],companies,indices,"2026-01-05",["NDX"]);
 assert.equal(one.indexed,true);
 assert.equal(one.baseline,"2026-01-05");
 assert.deepEqual(one.sets.map(s=>s.points[0].value),[100,100]);
 assert.equal(one.sets[0].points[1].value,125);
 assert.equal(one.sets[1].points[2].value,105);
 const both=buildPriceComparison(["TSLA","MSFT"],companies,indices,"2026-01-05",["NDX","SPX"]);
 assert.equal(both.sets.length,4);
 assert.deepEqual(both.sets.map(s=>s.points[0].value),[100,100,100,100]);
 assert.equal(both.sets[3].points[2].value,101);
 assert.equal(buildPriceComparison(["TSLA"],companies,indices,"2026-01-05",[]).indexed,false);
});
test("late listings show a partial-comparison warning and never acquire fabricated earlier prices",()=>{
 const stocks=new Map(companies);
 stocks.set("SPCX",[point("2026-06-12",100)]);
 const result=buildPriceComparison(["TSLA","SPCX"],stocks,indices,"2026-01-05",["NDX"]);
 assert.equal(result.sets[1].points.length,1);
 assert.equal(result.sets[1].points[0].value,100);
 assert.deepEqual(result.lateStarts,[{ticker:"SPCX",date:"2026-06-12"}]);
});
test("missing index data is exposed rather than substituted",()=>{
 const result=buildPriceComparison(["TSLA"],companies,new Map(),"2026-01-05",["NDX","SPX"]);
 assert.deepEqual(result.missing,["NDX","SPX"]);
 assert.equal(result.sets[1].points.length,0);
});
test("high and low are computed from raw closing prices, not normalized values",()=>{
 const ext=closingExtrema([{date:"2026-01-05",close:200},{date:"2026-01-06",close:150},{date:"2026-01-07",close:300}]);
 assert.equal(ext.low.date,"2026-01-06");
 assert.equal(ext.high.close,300);
 assert.equal(chartDateTicks("2026-01-01","2026-04-01").length,7);
 assert.ok(chartDateTicks("2021-01-01","2026-01-01").length>=5);
});
test("financial QoQ/YoY include operating-margin percentage points, reject missing precedent",()=>{
 const rows=[
  {fiscal_period:"2025-Q1",period_end:"2025-03-31",revenue_usd_bn:80,operating_income_usd_bn:16,operating_margin_pct:20},
  {fiscal_period:"2025-Q4",period_end:"2025-12-31",revenue_usd_bn:100,operating_income_usd_bn:25,operating_margin_pct:25},
  {fiscal_period:"2026-Q1",period_end:"2026-03-31",revenue_usd_bn:120,operating_income_usd_bn:36,operating_margin_pct:30}
 ];
 const [first,prev,now]=enrichQuarterlyFinance(rows);
 assert.equal(first.qoq.revenue,null);
 assert.equal(prev.yoy.revenue,null);
 assert.ok(Math.abs(now.qoq.revenue-20)<1e-9);
 assert.equal(now.yoy.revenue,50);
 assert.equal(now.qoq.margin,5);
 assert.equal(now.yoy.margin,10);
 assert.equal(now.qoq.capex,null);
});
const marketReport={
 mode:"BENCHMARK_REVIEW_ONLY",source:"Yahoo Finance",database_writes:0,writes_performed:0,
 observations:[
  ...Array.from({length:25},(_,i)=>({ticker:"NDX",source_symbol:"^NDX",date:new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10),close:"20000",unit:"index_points",currency:"USD",price_basis:"index_close"})),
  ...Array.from({length:25},(_,i)=>({ticker:"SPX",source_symbol:"^GSPC",date:new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10),close:"6000",unit:"index_points",currency:"USD",price_basis:"index_close"}))
 ],row_count:50
};
test("published index levels pass exact origin, schema and stale guards",async()=>{
 const fresh={...marketReport,observations:marketReport.observations.filter(r=>r.date<="2026-11-22")};
 fresh.row_count=fresh.observations.length;
 const data=validateMarketBenchmarkReport(fresh,{today:new Date("2026-11-22T15:00:00Z")});
 assert.equal(data.get("NDX").length,22);
 assert.equal(data.get("SPX").length,22);
 const bad={...fresh,observations:[...fresh.observations]};
 bad.observations[0]={...bad.observations[0],source_symbol:"SPY"};
 assert.throws(()=>validateMarketBenchmarkReport(bad,{today:new Date("2026-11-22T15:00:00Z")}),/출처/);
 assert.throws(()=>validateMarketBenchmarkReport(fresh,{today:new Date("2026-12-10T00:00:00Z")}),/오래/);
 let requested="";
 await loadPublishedMarketIndices({
  origin:"https://whsmac.github.io/investlab-test-pages/company-investment-analysis.html",
  today:new Date("2026-11-22T15:00:00Z"),
  fetcher:async(url,options)=>{requested=url;assert.equal(options.credentials,"omit");
   return {ok:true,headers:{get:()=>"application/json"},json:async()=>fresh};}
 });
 assert.equal(requested,"https://whsmac.github.io/investlab-test-pages/data/market-index-benchmarks.json");
 await assert.rejects(()=>loadPublishedMarketIndices({
  origin:"https://example.org/investlab-test-pages/company-investment-analysis.html",
  fetcher:async()=>{throw Error("must not run");}
 }),/호스트/);
});
test("latest TEST UI contains controls, dates, extrema, tooltips and financial comparison",()=>{
 const page=readFileSync(new URL("../company-investment-analysis.html",import.meta.url),"utf8");
 for(const id of ["tickerButtons","benchmarkButtons","benchmarkStatus","chartDetail","priceChart","financeRows"])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/buildPriceComparison\(active,series,benchmarkSeries,from/);
 assert.match(page,/selectedBenchmarks\.size>0/);
 assert.match(page,/svg\.onpointermove=handle/);
 assert.match(page,/svg\.onpointerdown=handle/);
 assert.match(page,/high\.close/);
 assert.match(page,/low\.close/);
 assert.match(page,/index\?"주가 · 선택기간 시작 100 기준":"주가 · USD 종가"/);
 assert.match(page,/delta\("qoq"\),delta\("yoy"\)/);
});
