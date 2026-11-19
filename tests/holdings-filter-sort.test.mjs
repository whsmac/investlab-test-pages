import test from 'node:test';import assert from 'node:assert/strict';import {filterAndSortHoldings as filter} from '../src/ledger/holdings-filter-sort.mjs';
const rows=[{ticker:'TSLA',quantityDisplay:'9.00000000'},{ticker:'SOXL',quantityDisplay:'12.00000000'},{ticker:'TQQQ',quantityDisplay:'100.00000000'}];
test('case-insensitive symbol search',()=>assert.deepEqual(filter(rows,{query:'ts'}).map(x=>x.ticker),['TSLA']));
test('sort symbols in both directions',()=>{assert.deepEqual(filter(rows).map(x=>x.ticker),['SOXL','TQQQ','TSLA']);assert.deepEqual(filter(rows,{sort:'symbol-desc'}).map(x=>x.ticker),['TSLA','TQQQ','SOXL']);});
test('sort quantities numerically not lexically',()=>{assert.deepEqual(filter(rows,{sort:'quantity-desc'}).map(x=>x.ticker),['TQQQ','SOXL','TSLA']);assert.deepEqual(filter(rows,{sort:'quantity-asc'}).map(x=>x.ticker),['TSLA','SOXL','TQQQ']);});
test('no mutation and invalid filter blocked',()=>{const before=JSON.stringify(rows);filter(rows,{sort:'quantity-desc'});assert.equal(JSON.stringify(rows),before);assert.throws(()=>filter(rows,{sort:'invalid'}));});
