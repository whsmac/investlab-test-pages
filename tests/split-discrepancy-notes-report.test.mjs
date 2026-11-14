import test from 'node:test';import assert from 'node:assert/strict';
import {buildSplitDiscrepancyNotesReport as build,restoreSplitDiscrepancyNotesReport as restore} from '../src/ledger/split-discrepancy-notes-report.mjs';
const u='11111111-1111-4111-8111-111111111111',a='33333333-3333-4333-8333-333333333333';
const base={sessionUserId:u,accounts:[{id:a,ownerId:u,name:'ISA'}],exportData:{format:'INVESTLAB_LEGACY_HOLDINGS_JSON',version:1,holdings:[{symbol:'TSLA',shares:'3',avg_cost:'200'}]},allocations:[{ticker:'TSLA',accountId:a,quantity:'3'}]};
const decisions=[{ticker:'TSLA',accountId:a,reason:'CHECK_TRADE_HISTORY',note:'거래내역 대조 필요'}];
test('export and restore notes without approval',()=>{const savedReport=build({...base,decisions});const result=restore({...base,savedReport});assert.equal(result.decisions[0].note,decisions[0].note);assert.equal(result.canPersist,false);});
test('reject stale quantity and unsafe report',()=>{const savedReport=build({...base,decisions});assert.throws(()=>restore({...base,savedReport,allocations:[{ticker:'TSLA',accountId:a,quantity:'2'}]}),/changed/);assert.throws(()=>restore({...base,savedReport:{...savedReport,canImport:true}}),/unsafe/);});
test('reject forged or duplicate notes',()=>{const savedReport=build({...base,decisions});assert.throws(()=>restore({...base,savedReport:{...savedReport,decisions:[...decisions,...decisions]}}),/duplicate/);});
