import test from 'node:test';import assert from 'node:assert/strict';import {suggestFailedTradeAdjustment as suggest} from '../src/simulator/scenario-trade-adjustment.mjs';
test('cash failure suggests additional cash or reduced buy size',()=>{const r=suggest({kind:'CASH',tradeNumber:1,available:200,shortfall:45},[{side:'buy',ticker:'SOXL',quantity:3,price:80,fee:5}]);assert.equal(r.additionalCashUsd,45);assert.equal(r.maxAffordableQuantity,2.4375)});
test('share failure suggests feasible sale quantity',()=>{const r=suggest({kind:'SHARES',tradeNumber:1,available:1,shortfall:2},[{side:'sell',ticker:'TSLA',quantity:3,price:200}]);assert.equal(r.maxSellQuantity,1);assert.equal(r.reduceQuantityBy,2)});
test('invalid input does not invent advice',()=>assert.equal(suggest(null,[]),null));
