import test from 'node:test';import assert from 'node:assert/strict';
import {reconcileHoldingsRoundTrip} from '../src/ledger/holdings-reconciliation.mjs';
const accountId='123e4567-e89b-12d3-a456-426614174000';
test('round-trip preserves original dashboard holdings, including USD equity',()=>{
 const h=[{symbol:'TSLA',shares:222,avg_cost:385.2,price:null,category:'개별주'},{symbol:'BITU',shares:160,avg_cost:14},{symbol:'TQQQ',shares:283,avg_cost:73.3},{symbol:'USD',shares:107,avg_cost:83.6}];
 const r=reconcileHoldingsRoundTrip(h,accountId);assert.equal(r.sourceCount,4);assert.equal(r.importCount,4);assert.ok(r.tickers.includes('USD'));
});
test('decimal strings are compared by value, not formatting',()=>assert.equal(reconcileHoldingsRoundTrip([{symbol:'TSLA',shares:'1.00',avg_cost:'385.20'}],accountId).importCount,1));
test('invalid or duplicate source blocks reconciliation',()=>{
 assert.throws(()=>reconcileHoldingsRoundTrip([{symbol:'TSLA',shares:1}],accountId));
 assert.throws(()=>reconcileHoldingsRoundTrip([{symbol:'TSLA',shares:1,avg_cost:1},{symbol:'TSLA',shares:2,avg_cost:2}],accountId));
});
