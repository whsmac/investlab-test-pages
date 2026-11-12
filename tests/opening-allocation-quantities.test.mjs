import test from 'node:test';import assert from 'node:assert/strict';import {summarizeAllocationQuantities as summary} from '../src/ledger/opening-allocation-quantities.mjs';
const holdings=[{symbol:'TSLA',shares:'100'},{symbol:'USD',shares:'2'}];
test('shows unallocated quantities without rounding',()=>{const r=summary({holdings,positionRows:[{ticker:'TSLA',quantity:'60'},{ticker:'TSLA',quantity:'30'},{ticker:'USD',quantity:'2'}]});assert.equal(r.rows[0].remaining,'10.00000000');assert.equal(r.rows[0].status,'미배정')});
test('shows over allocation',()=>assert.equal(summary({holdings,positionRows:[{ticker:'TSLA',quantity:'101'}]}).rows[0].status,'초과 배정'));
test('exact split matches and still cannot migrate',()=>{const r=summary({holdings,positionRows:[{ticker:'TSLA',quantity:'60'},{ticker:'TSLA',quantity:'40'},{ticker:'USD',quantity:'2'}]});assert.equal(r.allMatched,true);assert.equal(r.canMigrate,false)});
test('invalid quantity is visible',()=>assert.equal(summary({holdings,positionRows:[{ticker:'TSLA',quantity:'abc'}]}).rows[0].status,'입력 오류'));
test('eight decimal quantities are exact',()=>{const r=summary({holdings:[{symbol:'TSLA',shares:'0.30000000'}],positionRows:[{ticker:'TSLA',quantity:'0.10000000'},{ticker:'TSLA',quantity:'0.20000000'}]});assert.equal(r.rows[0].remaining,'0.00000000')});
