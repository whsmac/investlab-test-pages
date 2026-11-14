import test from 'node:test';import assert from 'node:assert/strict';import {extractPortfolioPositions,readPortfolioUsdCash,readPortfolioPositions} from '../src/simulator/portfolio-positions.mjs';
const holdings=[{symbol:'USD',shares:10,avg_cost:50},{symbol:'USD-CASH',shares:250,avg_cost:1},{symbol:'TSLA',shares:2,avg_cost:200},{symbol:'TSLA',shares:3,avg_cost:300}];
const storage={getItem:key=>key==='investlab_holdings'?JSON.stringify(holdings):null};
test('USD equity is a position, not cash',()=>{const p=readPortfolioPositions(storage);assert.equal(p.find(x=>x.ticker==='USD').quantity,10);assert.equal(readPortfolioUsdCash(storage),250)});
test('weighted cost and duplicate ticker aggregation',()=>{const p=extractPortfolioPositions(holdings);assert.equal(p.find(x=>x.ticker==='TSLA').quantity,5);assert.equal(p.find(x=>x.ticker==='TSLA').averageCost,260)});
test('cash is excluded from security positions',()=>assert.equal(extractPortfolioPositions(holdings).some(x=>x.ticker==='USD-CASH'),false));
test('invalid rows are excluded',()=>assert.deepEqual(extractPortfolioPositions([{symbol:'TSLA',shares:-1,avg_cost:100}]),[]));
