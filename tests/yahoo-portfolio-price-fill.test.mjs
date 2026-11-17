import test from "node:test";
import assert from "node:assert/strict";
import {previewYahooPortfolioPriceFill} from "../src/ledger/yahoo-portfolio-price-fill.mjs";
const tickers=["MSFT","GOOGL","AMZN","META","TSLA"];
function snapshot(day="2026-11-16"){
 const observations=tickers.map((ticker,i)=>({ticker,trading_date:day,close_price:String(100+i),
 currency:"USD",price_basis:"unadjusted_close"}));
 return {mode:"REVIEW_ONLY",source:"Yahoo Finance",database_insert_authorized:false,
 writes_performed:0,row_count:observations.length,observations};
}
const now=new Date("2026-11-17T08:00:00Z");
test("fills missing prices for supported holdings only",()=>{
 const result=previewYahooPortfolioPriceFill(snapshot(),[{ticker:"TSLA"},{ticker:"SPCX"}],{}, {now});
 assert.deepEqual(result.updates,{TSLA:104});
 assert.deepEqual(result.updateDates,{TSLA:"2026-11-16"});
 assert.deepEqual(result.skipped,[{ticker:"SPCX",reason:"UNSUPPORTED_TICKER"}]);
 assert.equal(result.canPersist,false);
});
test("preserves existing user price by default",()=>{
 const result=previewYahooPortfolioPriceFill(snapshot(),[{ticker:"TSLA"}],{TSLA:333},{now});
 assert.deepEqual(result.updates,{});
 assert.equal(result.skipped[0].reason,"USER_PRICE_PRESERVED");
});
test("explicit overwrite is required to replace user price",()=>{
 const result=previewYahooPortfolioPriceFill(snapshot(),[{ticker:"TSLA"}],{TSLA:333},{now,overwrite:true});
 assert.equal(result.updates.TSLA,104);
});
test("stale data never fills missing price",()=>{
 const result=previewYahooPortfolioPriceFill(snapshot("2026-09-01"),[{ticker:"TSLA"}],{}, {now});
 assert.deepEqual(result.updates,{});
 assert.equal(result.skipped[0].reason,"PRICE_UNAVAILABLE");
});
test("duplicate holdings rejected",()=>{
 assert.throws(()=>previewYahooPortfolioPriceFill(snapshot(),[{ticker:"TSLA"},{ticker:"TSLA"}],{}, {now}),/duplicate/);
});

test("different supported tickers preserve their own closing dates",()=>{
 const data=snapshot();
 data.observations.find(row=>row.ticker==="TSLA").trading_date="2026-11-13";
 const result=previewYahooPortfolioPriceFill(data,[{ticker:"TSLA"},{ticker:"MSFT"}],{}, {now});
 assert.deepEqual(result.updateDates,{TSLA:"2026-11-13",MSFT:"2026-11-16"});
});
