import test from 'node:test';import assert from 'node:assert/strict';import {matchLegacyCosts} from '../src/simulator/legacy-cost-suggestions.mjs';
const rows=[{ticker:'TSLA',quantity:3},{ticker:'SOXL',quantity:2}];
test('suggest cost only when ticker and quantity match',()=>{const r=matchLegacyCosts(rows,{format:'INVESTLAB_LEGACY_HOLDINGS_JSON',version:1,holdings:[{symbol:'TSLA',shares:'3',avg_cost:'185'},{symbol:'SOXL',shares:'5',avg_cost:'20'}]});assert.equal(r[0].suggestedCost,185);assert.equal(r[1].suggestedCost,null);assert.equal(r[1].status,'QUANTITY_MISMATCH');});
test('duplicate symbols are rejected',()=>assert.throws(()=>matchLegacyCosts(rows,{format:'INVESTLAB_LEGACY_HOLDINGS_JSON',version:1,holdings:[{symbol:'TSLA',shares:3,avg_cost:1},{symbol:'TSLA',shares:3,avg_cost:2}]})));
