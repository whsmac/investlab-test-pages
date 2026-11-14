import test from 'node:test';import assert from 'node:assert/strict';import {checkOpeningAllocationGate as gate} from '../src/ledger/opening-allocation-gate.mjs';
const holdings=[{symbol:'TSLA',shares:'100'}];
test('blocks under allocation with exact remainder',()=>{const r=gate({holdings,allocations:[{ticker:'TSLA',quantity:'90'}]});assert.equal(r.allowed,false);assert.equal(r.blocked[0].remaining,'10.00000000')});
test('blocks over allocation',()=>{const r=gate({holdings,allocations:[{ticker:'TSLA',quantity:'101'}]});assert.equal(r.blocked[0].status,'초과 배정')});
test('blocks malformed allocation quantity',()=>{const r=gate({holdings,allocations:[{ticker:'TSLA',quantity:'invalid'}]});assert.equal(r.allowed,false)});
test('allows exact split only for offline review',()=>{const r=gate({holdings,allocations:[{ticker:'TSLA',quantity:'60'},{ticker:'TSLA',quantity:'40'}]});assert.equal(r.allowed,true);assert.equal(r.canMigrate,false);assert.equal(r.canPost,false)});
test('empty holdings cannot pass',()=>assert.equal(gate({holdings:[],allocations:[]}).allowed,false));
