// TEST-only read-only valuation comparison. Does not mutate holdings, ledger or assumptions.
import {previewYahooPortfolioPriceFill} from "./yahoo-portfolio-price-fill.mjs";
import {previewPortfolioValuation} from "./portfolio-valuation-preview.mjs";

export function compareYahooPortfolioValuation({snapshot,holdings,accounts,assumedPrices={},priceMode="fill-missing",now=new Date()}){
 if(!["fill-missing","latest-close"].includes(priceMode))throw Error("Invalid price mode");
 const fill=previewYahooPortfolioPriceFill(snapshot,holdings,assumedPrices,{now,overwrite:priceMode==="latest-close"});
 const existing=previewPortfolioValuation({holdings,accounts,prices:assumedPrices});
 const prices=priceMode==="latest-close"?Object.fromEntries(Object.entries(fill.updates).map(([ticker,price])=>[ticker,String(price)])):{...assumedPrices,...Object.fromEntries(Object.entries(fill.updates).map(([ticker,price])=>[ticker,String(price)]))};
 const latest=previewPortfolioValuation({holdings,accounts,prices});
 const rows=latest.rows.map(row=>{
  const before=existing.rows.find(item=>item.ticker===row.ticker);
  const source=Object.hasOwn(fill.updates,row.ticker)?"YAHOO_LATEST_CLOSE":
   (priceMode!=="latest-close"&&assumedPrices[row.ticker]!==undefined&&assumedPrices[row.ticker]!==null&&String(assumedPrices[row.ticker]).trim()!==""?"USER_ASSUMPTION":"PRICE_UNAVAILABLE");
  return {ticker:row.ticker,source,tradingDate:fill.updateDates[row.ticker]??null,
   previousMarketValueUsd:before.marketValueUsd,marketValueUsd:row.marketValueUsd,
   differenceUsd:before.marketValueUsd!==null&&row.marketValueUsd!==null?row.marketValueUsd-before.marketValueUsd:null,
   unrealizedPnlUsd:row.unrealizedPnlUsd,status:row.status};
 });
 return {mode:"TEST_READ_ONLY_YAHOO_VALUATION_COMPARISON",priceMode,rows,existing,latest,fill,
  totalDifferenceUsd:existing.totalMarketValueUsd!==null&&latest.totalMarketValueUsd!==null
   ?latest.totalMarketValueUsd-existing.totalMarketValueUsd:null,
  canPersist:false,serverVerified:false};
}
