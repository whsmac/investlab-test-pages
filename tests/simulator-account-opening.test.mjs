import test from 'node:test';import assert from 'node:assert/strict';import {extractSimulatorAccountOpening as extract,extractSimulatorCombinedOpening as combine} from '../src/ledger/simulator-account-opening.mjs';
import {prepareOpeningLedgerHandoff} from '../src/ledger/opening-ledger-handoff.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const inputs={exportData:{format:'INVESTLAB_LEGACY_HOLDINGS_JSON',version:1,holdings:[{symbol:'TSLA',shares:'3',avg_cost:'100'},{symbol:'USD',shares:'2',avg_cost:'40'}]},accounts:[{id:a,name:'ISA',ownerConfirmed:true},{id:b,name:'연금',ownerConfirmed:true}],allocations:[{accountId:a,ticker:'TSLA',quantity:'1'},{accountId:b,ticker:'TSLA',quantity:'2'},{accountId:a,ticker:'USD',quantity:'2'}],cash:[{accountId:a,currency:'USD',balance:'500'},{accountId:b,currency:'KRW',balance:'2000'}],costConfirmations:[{accountId:a,ticker:'TSLA',confirmedAverageCostUsd:'110',ownerVerified:true},{accountId:b,ticker:'TSLA',confirmedAverageCostUsd:'95',ownerVerified:true},{accountId:a,ticker:'USD',confirmedAverageCostUsd:'40',ownerVerified:true}]};
const saved={format:'INVESTLAB_TEST_OPENING_REVIEW',version:1,reviewKind:'ledger-reconciliation',serverVerified:false,canPost:false,canMigrate:false,authorization:'NONE',inputs};
test('selected account receives only its own positions and USD cash',()=>{const r=extract({saved,accountId:a});assert.deepEqual(r.positions.map(p=>p.ticker),['TSLA','USD']);assert.equal(r.positions[0].averageCost,110);assert.equal(r.usdCash,500);assert.equal(r.canPost,false)});
test('other account has separate positions and zero USD cash',()=>{const r=extract({saved,accountId:b});assert.equal(r.positions.length,1);assert.equal(r.positions[0].quantity,2);assert.equal(r.usdCash,0)});
test('unconfirmed cost blocks simulator import',()=>assert.throws(()=>extract({saved:{...saved,inputs:{...inputs,costConfirmations:[]}},accountId:a}),/완료되지/));
test('unknown account blocks import',()=>assert.throws(()=>extract({saved,accountId:'33333333-3333-4333-8333-333333333333'}),/소유/));
test('unsafe review file blocked',()=>assert.throws(()=>extract({saved:{...saved,canPost:true},accountId:a}),/지원하지/));

test('two accounts combine TSLA quantity and weighted average cost',()=>{const r=combine({saved,accountIds:[a,b]});const tsla=r.positions.find(p=>p.ticker==='TSLA');assert.equal(tsla.quantity,3);assert.equal(tsla.averageCost,100);assert.equal(r.usdCash,500);assert.equal(r.positions.find(p=>p.ticker==='USD').quantity,2)});
test('single selected account stays isolated',()=>{const r=combine({saved,accountIds:[b]});assert.equal(r.positions.length,1);assert.equal(r.positions[0].averageCost,95);assert.equal(r.usdCash,0)});
test('duplicate account selection is blocked',()=>assert.throws(()=>combine({saved,accountIds:[a,a]}),/중복/));
test('empty selection is blocked',()=>assert.throws(()=>combine({saved,accountIds:[]}),/하나 이상/));
