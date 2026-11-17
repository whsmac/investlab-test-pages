// TEST-only deterministic dry-run of Yahoo price fill and portfolio valuation.
// Does not fetch, store, or mutate the caller's holdings, prices, or ledger.
import {previewYahooPortfolioPriceFill} from "./yahoo-portfolio-price-fill.mjs";
import {previewPortfolioValuation} from "./portfolio-valuation-preview.mjs";

export function previewYahooPortfolioValuation({snapshot,holdings,accounts,assumedPrices={},now=new Date()}){
 const fill=previewYahooPortfolioPriceFill(snapshot,holdings,assumedPrices,{now});
 const prices={...assumedPrices,...Object.fromEntries(Object.entries(fill.updates).map(([ticker,price])=>[ticker,String(price)]))};
 const valuation=previewPortfolioValuation({holdings,accounts,prices});
 return {mode:"TEST_READ_ONLY_YAHOO_VALUATION_PREVIEW",fill,valuation,
   canPersist:false,serverVerified:false};
}
