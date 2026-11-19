import test from 'node:test';import assert from 'node:assert/strict';
import {serializeLegacyHoldingsExport} from '../src/ledger/legacy-holdings-export.mjs';
import {parseLegacyHoldingsFile} from '../src/ledger/legacy-file-import.mjs';
import {collectManagedSymbols} from '../src/simulator/managed-symbols.mjs';
const id='123e4567-e89b-12d3-a456-426614174000';
test('original index.html holdings schema exports and imports including USD equity ticker',()=>{
 const seed=[{symbol:'TSLA',shares:222,avg_cost:385.2,price:null,category:'개별주'},
 {symbol:'BITU',shares:160,avg_cost:14,price:null,category:'비트코인 레버리지'},
 {symbol:'TQQQ',shares:283,avg_cost:73.3,price:null,category:'나스닥 레버리지'},
 {symbol:'USD',shares:107,avg_cost:83.6,price:null,category:'반도체 레버리지'}];
 const r=parseLegacyHoldingsFile(serializeLegacyHoldingsExport(seed),id);
 assert.equal(r.positions.length,4);assert.equal(r.positions.find(p=>p.ticker==='USD').quantity,'107');
 assert.equal(r.positions.find(p=>p.ticker==='USD').averageCostUsd,'83.6');
 assert.ok(collectManagedSymbols({holdings:seed}).some(x=>x.ticker==='USD'));
});
test('USD-CASH is not interpreted as a stock',()=>{
 assert.throws(()=>serializeLegacyHoldingsExport([{symbol:'USD-CASH',shares:100,avg_cost:1}]));
});
