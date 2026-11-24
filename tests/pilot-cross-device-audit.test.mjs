import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {projectServerAudit,cloudFingerprint,ledgerStatusText,strategyStatusText,verifyStrategyRows} from '../src/sync/pilot-cross-device-audit.mjs';
import {stablePilotLedger} from '../src/ledger/pilot-ledger-readonly-consistency.mjs';

const user='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const revision='2026-11-24T10:00:00.000Z';
const initial=()=>({
 version:1,
 accounts:[{id:'broker1',name:'계좌 A'},{id:'broker2',name:'계좌 B'}],
 entries:[
  {id:'e1',accountId:'broker1',type:'OPEN',date:'2026-11-20',symbol:'TSLA',qty:3,price:200,currency:'USD'},
  {id:'e2',accountId:'broker1',type:'OPEN',date:'2026-11-20',symbol:'USD',qty:2,price:45,currency:'USD'},
  {id:'e3',accountId:'broker1',type:'DEPOSIT',date:'2026-11-20',currency:'USD',amount:400},
  {id:'e4',accountId:'broker2',type:'OPEN',date:'2026-11-20',symbol:'BITU',qty:10,price:20,currency:'USD'},
  {id:'e5',accountId:'broker2',type:'OPEN',date:'2026-11-20',symbol:'TQQQ',qty:5,price:60,currency:'USD'},
  {id:'e6',accountId:'broker2',type:'DEPOSIT',date:'2026-11-20',currency:'KRW',amount:150000}
 ]});
const strategies=()=>[
 {name:'상승 부분매도',strategies:[{name:'상승 부분매도',trades:[]}],updated_at:revision},
 {name:'하락 부분매수',strategies:[{name:'하락 부분매수',trades:[]}],updated_at:revision}
];
const baseline=payload=>JSON.stringify({payload:stablePilotLedger(payload),revision});
const common=(override={})=>{
 const payload=initial();
 return {ownerId:user,remote:{payload,updated_at:revision},
  strategies:strategies(),localOwnerId:user,localRaw:JSON.stringify(payload),
  baselineRaw:baseline(payload),
  localStrategiesRaw:JSON.stringify(Object.fromEntries(strategies().map(row=>[row.name,row.strategies]))),
  localDraftRaw:null,...override};
};

test('server projection reports the two real account types and separates USD ETF from dollar cash',()=>{
 const result=projectServerAudit(common());
 assert.equal(result.ownerVerified,true);
 assert.equal(result.ledgerStatus,'SERVER_MATCH');
 assert.equal(result.strategiesStatus,'MATCH');
 assert.equal(result.warning,false);
 assert.deepEqual([result.accountCount,result.transactionCount,result.holdingCount,result.strategyCount],[2,6,4,2]);
 assert.equal(result.accountRows[0].cashUSD,400);
 assert.deepEqual(result.accountRows[0].holdings.map(h=>[h.ticker,h.quantity]),[['TSLA',3],['USD',2]]);
 assert.equal(result.accountRows[1].cashKRW,150000);
 assert.equal(result.accountRows[1].cashUSD,0);
 assert.equal(result.accountRows[1].holdings.length,2);
 assert.equal(result.serverStrategyNames.length,2);
});
test('PC/mobile with same verified cloud data get exactly the same server comparison code',async()=>{
 const one=projectServerAudit(common());
 const phone=projectServerAudit(common({
  localOwnerId:other,localRaw:null,localStrategiesRaw:null,localDraftRaw:null,baselineRaw:null
 }));
 assert.equal(phone.ledgerStatus,'SERVER_MATCH');
 assert.equal(phone.strategiesStatus,'CLOUD_ONLY');
 assert.equal(phone.accountCount,2);
 assert.equal(await cloudFingerprint(one.fingerprintInput,webcrypto),
  await cloudFingerprint(phone.fingerprintInput,webcrypto));
 assert.match(await cloudFingerprint(one.fingerprintInput,webcrypto),/^IL1-[0-9A-F]{16}$/);
 const otherAccount=projectServerAudit(common({ownerId:other,localOwnerId:other,localRaw:null,localStrategiesRaw:null}));
 assert.notEqual(await cloudFingerprint(one.fingerprintInput,webcrypto),
  await cloudFingerprint(otherAccount.fingerprintInput,webcrypto),'different owner cannot share a comparison code');
});
test('unsynced local transactions are flagged but cloud fingerprint remains server-based',async()=>{
 const latest=initial();
 latest.entries.push({id:'e7',accountId:'broker2',type:'OPEN',date:'2026-11-24',
   symbol:'SOXL',qty:4,price:33,currency:'USD'});
 const pending=projectServerAudit(common({localRaw:JSON.stringify(latest)}));
 const cloud=projectServerAudit(common());
 assert.equal(pending.ledgerStatus,'LOCAL_PENDING');
 assert.equal(pending.warning,true);
 assert.equal(pending.accountCount,2);
 assert.deepEqual(pending.accountRows,cloud.accountRows,'do not represent unsynced local positions as published');
 assert.equal(await cloudFingerprint(pending.fingerprintInput,webcrypto),
  await cloudFingerprint(cloud.fingerprintInput,webcrypto));
});
test('concurrent new server revision never automatically overwrites an unsynced device',()=>{
 const updated=projectServerAudit(common({
  remote:{payload:initial(),updated_at:'2026-11-24T11:00:00.000Z'},
  localRaw:JSON.stringify({...initial(),entries:[...initial().entries,{
   id:'pending',accountId:'broker1',type:'DEPOSIT',date:'2026-11-24',currency:'USD',amount:10}]})
 }));
 assert.equal(updated.ledgerStatus,'LOCAL_DIFFERENCE');
 assert.equal(updated.warning,true);
 assert.match(ledgerStatusText[updated.ledgerStatus],/자동 덮어쓰지/);
});
test('strategy differences and unsaved editor drafts are reported independently',()=>{
 const changed={...Object.fromEntries(strategies().map(row=>[row.name,row.strategies]))};
 changed['상승 부분매도']=[{name:'changed',trades:[]}];
 changed['로컬 미저장']=[{name:'로컬 미저장',trades:[]}];
 const report=projectServerAudit(common({
  localStrategiesRaw:JSON.stringify(changed),localDraftRaw:'{"version":1}'
 }));
 assert.equal(report.strategiesStatus,'LOCAL_DIFFERENCE');
 assert.equal(report.localExtraStrategies,1);
 assert.equal(report.localChangedStrategies,1);
 assert.equal(report.hasLocalDraft,true);
 assert.equal(report.warning,true);
 assert.match(strategyStatusText.LOCAL_DIFFERENCE,/덮어쓰지/);
});
test('server-only strategy not yet loaded on mobile is not falsely reported as lost',()=>{
 const report=projectServerAudit(common({localStrategiesRaw:'{"상승 부분매도":[{"name":"상승 부분매도","trades":[]}]}'}));
 assert.equal(report.strategiesStatus,'CLOUD_NOT_DOWNLOADED');
 assert.equal(report.localMissingStrategies,1);
 assert.equal(report.warning,false);
});
test('server missing and parked local-only ledger are clearly distinguished',()=>{
 const report=projectServerAudit(common({remote:null,baselineRaw:null}));
 assert.equal(report.ledgerStatus,'SERVER_MISSING_LOCAL_ONLY');
 assert.equal(report.accountCount,0);
 assert.equal(report.transactionCount,0);
 assert.equal(report.warning,true);
 assert.equal(projectServerAudit(common({remote:null,localRaw:null,localOwnerId:other})).ledgerStatus,'SERVER_EMPTY');
});
test('different user and malformed server data fail closed before rendering',()=>{
 assert.throws(()=>projectServerAudit(common({ownerId:'x'})),/확인되지 않은/);
 assert.throws(()=>projectServerAudit(common({remote:{payload:{...initial(),entries:[{bad:true}]},updated_at:revision}})),/거래내역/);
 assert.throws(()=>verifyStrategyRows([{name:'__proto__',strategies:[{}]}]),/형식/);
 assert.throws(()=>verifyStrategyRows([{name:'x',strategies:[{}]},{name:'x',strategies:[{}]}]),/형식/);
 assert.throws(()=>verifyStrategyRows(Array.from({length:101},(_,i)=>({name:'t'+i,strategies:[{}]}))),/많거나/);
});
test('canonical fingerprint changes for newly saved server transactions or strategies',async()=>{
 const a=projectServerAudit(common());
 const newLedger=initial();newLedger.entries.push({
  id:'e9',accountId:'broker1',type:'DEPOSIT',date:'2026-11-24',currency:'USD',amount:1
 });
 const b=projectServerAudit(common({remote:{payload:newLedger,updated_at:'new'}}));
 assert.notEqual(await cloudFingerprint(a.fingerprintInput,webcrypto),
  await cloudFingerprint(b.fingerprintInput,webcrypto));
 const newStrategies=strategies();newStrategies[0].strategies=[{name:'새 전략',trades:[]}];
 const c=projectServerAudit(common({strategies:newStrategies}));
 assert.notEqual(await cloudFingerprint(a.fingerprintInput,webcrypto),
  await cloudFingerprint(c.fingerprintInput,webcrypto));
});
test('TEST settings UI has read-only diagnostics, mobile-safe table and no sensitive public writes',()=>{
 const html=readFileSync(new URL('../data-management.html',import.meta.url),'utf8');
 for(const id of ['syncCheck','syncStatus','syncResults','syncCloudCode','syncAccountRows','syncStrategyNames'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/\.sync-grid\{display:grid/);
 assert.match(html,/max-width:650px/);
 assert.match(html,/href="\.\/index\.html#login"/);
 const start=html.indexOf('async function checkCrossDeviceSync(){'),end=html.indexOf("$('syncCheck').addEventListener",start);
 assert.ok(start>0&&end>start);
 const body=html.slice(start,end);
 assert.match(body,/auth\.getUser\(\)/);
 assert.match(body,/client\.from\('investlab_pilot_ledger_documents'\)\.select/);
 assert.match(body,/client\.from\('investlab_simulator_strategies'\)\.select/);
 assert.match(body,/cloudFingerprint\(/);
 assert.doesNotMatch(body,/\.upsert\(|\.insert\(|\.update\(|\.delete\(|signInWithPassword\(/);
 assert.doesNotMatch(body,/fetch\(.*supabase/);
 const render=html.slice(html.indexOf('function renderCrossDeviceAudit('),start);
 assert.match(render,/\.textContent=/);
 assert.doesNotMatch(render,/\.innerHTML\s*=/);
});
test('new module and original data-management script remain valid ES modules',()=>{
 const html=readFileSync(new URL('../data-management.html',import.meta.url),'utf8');
 const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match);
 const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:match[1],encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});
