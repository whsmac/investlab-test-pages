import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveVerifiedPilotLedger,stablePilotLedger,cloudLedgerBaselineKey} from '../src/ledger/pilot-ledger-readonly-consistency.mjs';
import {projectLedger} from '../src/ledger/pilot-portfolio-projection.mjs';
import {compareLedgerOpening} from '../src/simulator/test-ledger-session-safety.mjs';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const revision='2026-11-24T05:00:00.000Z';
const base=()=>({version:1,accounts:[{id:'acc',name:'TEST account',type:'일반'}],entries:[
 {id:'open',accountId:'acc',date:'2026-11-23',created:10,type:'OPEN',symbol:'TSLA',qty:5,price:100,currency:'USD',amount:0},
 {id:'cash',accountId:'acc',date:'2026-11-23',created:11,type:'DEPOSIT',currency:'USD',amount:500}
]});
const update=()=>{const next=base();next.entries.push(
 {id:'add',accountId:'acc',date:'2026-11-24',created:12,type:'OPEN',symbol:'TQQQ',qty:10,price:50,currency:'USD',amount:0}
);return next;};
const remote=payload=>({payload,updated_at:revision});
const baseline=payload=>JSON.stringify({payload:stablePilotLedger(payload),revision});
function resolve(extra){return resolveVerifiedPilotLedger({
 userId:owner,remote:remote(base()),localOwnerId:owner,
 localRaw:JSON.stringify(update()),baselineRaw:baseline(base()),...extra
});}
test('verified owner sees newest local pending positions when server is exact baseline',()=>{
 const result=resolve();
 assert.equal(result.source,'LOCAL_PENDING');
 assert.deepEqual(projectLedger(result.payload).holdings.map(p=>[p.symbol,p.qty]),[['TQQQ',10],['TSLA',5]]);
 assert.match(result.notice,/동기화 대기/);
});
test('same content shows server, not a false pending status',()=>{
 const result=resolve({localRaw:JSON.stringify(base())});
 assert.equal(result.source,'SERVER');
 assert.deepEqual(result.payload,base());
});
test('another account local data is never displayed or inferred',()=>{
 const result=resolve({localOwnerId:other,localRaw:JSON.stringify(update())});
 assert.equal(result.source,'SERVER');
 assert.equal(projectLedger(result.payload).holdings.length,1);
});
test('changed server revision prevents silently accepting stale browser edits',()=>{
 const result=resolve({remote:{payload:base(),updated_at:'2026-11-24T06:00:00.000Z'}});
 assert.equal(result.source,'SERVER_WITH_LOCAL_DIFFERENCE');
 assert.equal(projectLedger(result.payload).holdings.length,1);
 assert.match(result.notice,/덮어쓰지 않았습니다/);
});
test('unknown baseline prevents locally cached draft from replacing server',()=>{
 const result=resolve({baselineRaw:null});
 assert.equal(result.source,'SERVER_WITH_LOCAL_DIFFERENCE');
});
test('server absent allows only same-owner validated browser ledger',()=>{
 const result=resolve({remote:null});
 assert.equal(result.source,'LOCAL_PENDING');
 assert.equal(projectLedger(result.payload).holdings.length,2);
 assert.equal(resolve({remote:null,localOwnerId:other}).source,'EMPTY');
});
test('invalid owner or corrupt server fails closed',()=>{
 assert.throws(()=>resolve({userId:'unauthorized'}),/확인되지 않은/);
 assert.throws(()=>resolve({remote:remote({version:1,accounts:[{id:'a',name:'X'}],entries:[{type:'BUY'}]})}),/거래내역/);
});
test('malformed local ledger never overrides a valid server ledger',()=>{
 assert.equal(resolve({localRaw:'bad JSON'}).source,'SERVER');
});
test('read-only shared resolver and relevant modules are wired to refresh without overwriting user data',()=>{
 assert.equal(cloudLedgerBaselineKey(owner),'investlab_pilot_ledger_cloud_base_v1:'+owner);
 const portfolio=readFileSync(new URL('../my-portfolio.html',import.meta.url),'utf8');
 const simulator=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
 const ledger=readFileSync(new URL('../pilot-ledger.html',import.meta.url),'utf8');
 for(const html of [portfolio,simulator]){
  assert.match(html,/resolveVerifiedPilotLedger\(/);
  assert.match(html,/cloudLedgerBaselineKey\(/);
  assert.match(html,/addEventListener\('focus'/);
  assert.match(html,/visibilitychange/);
 }
 assert.match(portfolio,/id="portfolioSyncBanner"/);
 assert.match(simulator,/id="syncPilotLedgerStart"[^>]*hidden/);
 assert.match(simulator,/updateOnlineLedgerApplyPrompt\(opening\)/);
 assert.match(ledger,/이 기기 저장 완료 · TEST 서버 자동 저장 진행 중/);
});

test('simulator opening detects updated account quantities, weighted basis and USD cash without mutating a draft',()=>{
 const ledger=base();
 ledger.accounts.push({id:'b',name:'Synthetic B'});
 ledger.entries.push({id:'other',accountId:'b',date:'2026-11-23',created:20,type:'OPEN',symbol:'TSLA',qty:3,price:150,currency:'USD',amount:0},
  {id:'fund',accountId:'b',date:'2026-11-23',created:21,type:'DEPOSIT',currency:'USD',amount:200});
 const before=projectLedger(ledger),opening=p=>p.holdings.map(h=>({ticker:h.symbol,quantity:h.qty,averageCost:h.averageCost}));
 const draft=opening(before),original=JSON.stringify(draft);
 assert.equal(before.holdings[0].averageCost,118.75);
 ledger.entries.push({id:'fee-buy',accountId:'b',date:'2026-11-24',created:22,type:'BUY',symbol:'TSLA',qty:1,price:100,feeUsd:1,currency:'USD',amount:0});
 const fresh=projectLedger(ledger);
 assert.equal(fresh.holdings[0].qty,9);assert.equal(fresh.cash.USD,599);
 assert.deepEqual(compareLedgerOpening({currentPositions:draft,currentCash:before.cash.USD,freshPositions:opening(fresh),freshCash:fresh.cash.USD}),{matches:false,changedTickers:['TSLA'],cashChanged:true});
 assert.equal(JSON.stringify(draft),original);
 assert.deepEqual(compareLedgerOpening({currentPositions:opening(fresh),currentCash:fresh.cash.USD+1e-10,freshPositions:opening(fresh),freshCash:fresh.cash.USD}),{matches:true,changedTickers:[],cashChanged:false});
 assert.equal(projectLedger(ledger,'acc').holdings[0].qty,5);
 assert.equal(projectLedger(ledger,'b').holdings[0].qty,4);
});
