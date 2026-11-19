import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessPortfolioLedgerPilot} from '../src/sync/portfolio-ledger-pilot-gaps.mjs';
test('even matching empty offline ledger never claims pilot ready',()=>{
 const report=assessPortfolioLedgerPilot({positions:[],cash:[],events:[]});
 assert.equal(report.reconciliation.status,'OFFLINE_QUANTITIES_MATCH_NOT_SERVER_VERIFIED');
 assert.equal(report.pilotReady,false);assert.equal(report.canPost,false);assert.equal(report.canSync,false);
 assert.equal(report.missing.length,5);
});
test('externally supplied booleans cannot bypass final five-module pilot gate',()=>{
 const report=assessPortfolioLedgerPilot({positions:[],cash:[],events:[]},{authenticated:true,dbSchemaVerified:true,twoUserIsolationVerified:true,serverRoundTripVerified:true});
 assert.equal(report.pilotReady,false);assert.equal(report.missing.length,1);
});
test('pilot gap UI is read-only and uses textContent',()=>{
 const html=readFileSync(new URL('../test-portfolio-ledger-reconcile.html',import.meta.url),'utf8');
 assert.match(html,/id="pilot-gap-review"/);assert.match(html,/assessPortfolioLedgerPilot\(input\)/);
 assert.match(html,/item.textContent=/);assert.match(html,/서버 저장 차단/);
});
