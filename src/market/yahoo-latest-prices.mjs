// TEST-only read-only adapter for the five public Yahoo review tickers.
// This is an optional source; never silently substitute stale data for live quotes.
import {buildYahooChartSeries} from "./yahoo-review-chart-series.mjs";
import {assessYahooChartFreshness} from "./yahoo-chart-freshness.mjs";

export function buildYahooLatestPrices(snapshot,{now=new Date(),maxAgeDays=7}={}){
  const freshness=assessYahooChartFreshness(snapshot,{now,maxAgeDays});
  const series=buildYahooChartSeries(snapshot,{limit:2});
  const details=new Map(freshness.details.map(row=>[row.ticker,row]));
  const prices=series.map(row=>{
    const latest=row.points.at(-1);
    const state=details.get(row.ticker);
    return {ticker:row.ticker,price:state.status==="current"&&latest?latest.close:null,
      tradingDate:state.lastTradingDate,status:state.status,
      currency:"USD",source:"Yahoo Finance (TEST REVIEW_ONLY)",isLive:false};
  });
  return {mode:"TEST_READ_ONLY_LATEST_PRICES",overallStatus:freshness.status,
    publishedAt:freshness.publishedAt,prices};
}
