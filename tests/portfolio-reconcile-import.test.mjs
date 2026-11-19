import test from 'node:test';import assert from 'node:assert/strict';
import {importPortfolioExportForReconciliation as load} from '../src/ledger/portfolio-reconcile-import.mjs';
const id='11111111-1111-4111-8111-111111111111';
const json=JSON.stringify({format:'INVESTLAB_LEGACY_HOLDINGS_JSON',version:1,holdings:[{symbol:'TSLA',shares:'2',avg_cost:'150'},{symbol:'USD',shares:'3',avg_cost:'40'}]});
test('legacy holdings load with explicit account, USD ETF stays security',()=>{const r=load(json,id);assert.equal(r.positions.length,2);assert.equal(r.positions[1].ticker,'USD');assert.deepEqual(r.cash,[]);assert.deepEqual(r.events,[]);assert.equal(r.canUpload,false)});
test('missing account UUID rejected',()=>assert.throws(()=>load(json,''),/account UUID/));
test('unknown format rejected',()=>assert.throws(()=>load(JSON.stringify({format:'wrong',version:1,holdings:[]}),id),/unsupported/));
test('duplicate holdings rejected',()=>assert.throws(()=>load(JSON.stringify({format:'INVESTLAB_LEGACY_HOLDINGS_JSON',version:1,holdings:[{symbol:'TSLA',shares:'1',avg_cost:'1'},{symbol:'TSLA',shares:'2',avg_cost:'2'}]}),id),/ambiguous|duplicate/));
test('invalid quantity rejected',()=>assert.throws(()=>load(JSON.stringify({format:'INVESTLAB_LEGACY_HOLDINGS_JSON',version:1,holdings:[{symbol:'TSLA',shares:'bad',avg_cost:'1'}]}),id),/ambiguous|incomplete/));
