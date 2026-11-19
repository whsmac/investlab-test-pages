import test from 'node:test';
import assert from 'node:assert/strict';
import {serializeLegacyHoldingsExport} from '../src/ledger/legacy-holdings-export.mjs';
import {parseLegacyHoldingsFile} from '../src/ledger/legacy-file-import.mjs';
const id='123e4567-e89b-12d3-a456-426614174000';
test('export/import round-trip preserves quantity and cost',()=>{
 const text=serializeLegacyHoldingsExport([{symbol:'TSLA',shares:10,avg_cost:250},{symbol:'SOXL',shares:'2',avg_cost:'40.5'}]);
 const parsed=parseLegacyHoldingsFile(text,id);
 assert.equal(parsed.positions.length,2);
 assert.equal(parsed.positions[0].quantity,'10');
 assert.equal(parsed.positions[1].averageCostUsd,'40.5');
});
test('rejects incomplete data',()=>assert.throws(()=>serializeLegacyHoldingsExport([{symbol:'TSLA',shares:10}])));
test('rejects duplicates',()=>assert.throws(()=>serializeLegacyHoldingsExport([{symbol:'TSLA',shares:1,avg_cost:100},{symbol:'TSLA',shares:2,avg_cost:200}])));
test('rejects empty data',()=>assert.throws(()=>serializeLegacyHoldingsExport([])));
