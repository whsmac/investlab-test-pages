import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validForecastPrice,forecastTarget,forecastSnapshot,validateForecastSnapshot,restoreForecastSnapshot,assignForecastToTrade} from "../src/simulator/bear-bull-target-prices.mjs";
import {simulateTrades} from "../src/simulator/virtual-trade-engine.mjs";

const prices=[
 {ticker:"TSLA",price:220,bearPrice:150,bullPrice:320},
 {ticker:"SOXL",price:25,bearPrice:15,bullPrice:45},
 {ticker:"TQQQ",price:50,bearPrice:30,bullPrice:80}
];
test("each stock accepts independent bearish and bullish goals",()=>{
 assert.equal(forecastTarget(prices,"TSLA","bear"),150);
 assert.equal(forecastTarget(prices,"TSLA","bull"),320);
 assert.equal(forecastTarget(prices,"SOXL","bear"),15);
 assert.equal(forecastTarget(prices,"SOXL","bull"),45);
 assert.equal(forecastTarget(prices,"TQQQ","bull"),80);
 assert.equal(forecastTarget(prices,"TSLA","wrong"),null);
 assert.equal(forecastTarget(prices,"MSFT","bear"),null);
});
test("manual executions never change when forecast target is read",()=>{
 const trade={side:"sell",ticker:"TSLA",quantity:3,price:250};
 const result=assignForecastToTrade(trade,prices,"bear");
 assert.equal(result.price,150);
 assert.equal(result.priceBasis,"bear");
 assert.deepEqual(trade,{side:"sell",ticker:"TSLA",quantity:3,price:250});
 assert.throws(()=>assignForecastToTrade({ticker:"MSFT"},prices,"bull"),/먼저 입력/);
 assert.equal(validForecastPrice(""),false);
 assert.equal(validForecastPrice(0),false);
});
test("two-symbol bear/bull targets drive sequential switch trading",()=>{
 const make=(side,ticker,quantity,phase)=>assignForecastToTrade({side,ticker,quantity},prices,phase);
 const trades=[make("sell","TSLA",3,"bull"),make("buy","SOXL",30,"bear"),
  make("sell","SOXL",30,"bull"),make("buy","TSLA",5,"bear")];
 const result=simulateTrades({cash:0,positions:{TSLA:{quantity:10,averageCost:200}}},trades);
 assert.equal(result.final.cash,600);
 assert.equal(result.final.positions.TSLA.quantity,12);
 assert.equal(result.final.positions.SOXL?.quantity??0,0);
 assert.equal(trades[0].price,320);
 assert.equal(trades[1].price,15);
 assert.equal(trades[2].price,45);
 assert.equal(trades[3].price,150);
});
test("targets survive saved strategy JSON and do not mutate input",()=>{
 const snapshot=forecastSnapshot(prices),safe=validateForecastSnapshot(snapshot);
 assert.deepEqual(safe.TSLA,{bear:150,bull:320});
 assert.deepEqual(safe.SOXL,{bear:15,bull:45});
 const old=[{ticker:"TSLA",price:200},{ticker:"SOXL",price:20}];
 const restored=restoreForecastSnapshot(old,safe);
 assert.deepEqual(old,[{ticker:"TSLA",price:200},{ticker:"SOXL",price:20}]);
 assert.equal(restored.find(x=>x.ticker==="TSLA").price,320);
 assert.equal(restored.find(x=>x.ticker==="SOXL").bearPrice,15);
 const legacy=forecastSnapshot([{ticker:"TSLA",price:245}]);
 assert.equal(legacy.TSLA.bull,245);
 assert.throws(()=>validateForecastSnapshot({TSLA:{bear:-3}}),/0보다 큰/);
 assert.throws(()=>validateForecastSnapshot({TSLA:{bear:NaN}}),/0보다 큰/);
});
test("Pilot removes two unnecessary controls, adds per-trade price basis and rename",()=>{
 const html=readFileSync(new URL("../virtual-trade-simulator.html",import.meta.url),"utf8");
 for(const id of ["pilotLedgerAccount","priceEditor","strategyEditor","currentQuotesStatus"])assert.match(html,new RegExp('id="'+id+'"'));
 for(const id of ["loadPilotLedgerCloud","fillBlankAssumedPrices"])assert.doesNotMatch(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/<h2>공통 최종 가정 주가 · 기본값<\/h2>/);
 assert.match(html,/가상거래 시뮬레이터/);
 assert.match(html,/하락 예상가 USD/);
 assert.match(html,/상승 예상가 USD/);
 assert.match(html,/하락 예상가 적용/);
 assert.match(html,/상승 예상가 적용/);
 assert.match(html,/phase\.dataset\.field='priceBasis'/);
 assert.match(html,/forecastPrices:forecastSnapshot\(portfolioState\.prices\)/);
 assert.match(html,/function applySelectedOnlineAccountToSimulator\(\)/);
 assert.match(html,/byId\('pilotLedgerAccount'\)\.addEventListener\('change',applySelectedOnlineAccountToSimulator\)/);
});
