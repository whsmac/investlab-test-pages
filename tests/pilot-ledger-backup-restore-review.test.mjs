import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBackupLedger,validateOnlineBackup,planOnlineRestore} from '../src/ledger/pilot-backup-restore-review.mjs';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const base={version:1,accounts:[{id:'a',name:'fixture'}],entries:[{id:'d',accountId:'a',date:'2026-01-02',type:'DEPOSIT',currency:'USD',amount:1000},{id:'b',accountId:'a',date:'2026-01-03',type:'BUY',currency:'USD',symbol:'TSLA',qty:2,price:100}]};
const strategy=n=>[{name:n,trades:[]}];
const online={project:'investlab-ledger-test',ledger:base,strategies:{same:strategy('same'),new:strategy('new'),replace:strategy('changed')}};
test('valid ledger and backup accepted',()=>{validateBackupLedger(base);validateOnlineBackup(online)});
test('invalid ledger rejects duplicate ids, foreign account, oversold, overspent and impossible dates',()=>{
 const cases=[
  {...base,entries:[...base.entries,base.entries[0]]},
  {...base,entries:[{...base.entries[0],accountId:'foreign'}]},
  {...base,entries:[...base.entries,{...base.entries[1],id:'s',type:'SELL',qty:3,date:'2026-01-04'}]},
  {...base,entries:[base.entries[0],{...base.entries[1],price:1000}]},
  {...base,entries:[{...base.entries[0],date:'2026-02-30'}]},
  {...base,entries:[{...base.entries[0],amount:true}]},
 ];
 for(const value of cases)assert.throws(()=>validateBackupLedger(value));
});
test('restore plan identifies changes without mutating any input',()=>{
 const current={same:strategy('same'),replace:strategy('old'),keep:strategy('keep')};
 const before=JSON.stringify({online,current});
 const result=planOnlineRestore({ownerId:A,verifiedUserId:A,online,currentLedger:base,currentStrategies:current});
 assert.deepEqual(result.strategies,{add:1,replace:1,unchanged:1,preserve:1});
 assert.equal(result.ledgerAction,'unchanged');
 assert.equal(result.canWrite,false);
 assert.equal(result.atomicRestoreVerified,false);
 assert.equal(JSON.stringify({online,current}),before);
});
test('null ledger means preserve not delete; other account and invalid strategy rejected',()=>{
 const p={...online,ledger:null};
 const args={ownerId:A,verifiedUserId:A,online:p,currentLedger:base,currentStrategies:{}};
 assert.equal(planOnlineRestore(args).ledgerAction,'preserve');
 assert.equal(planOnlineRestore(args).entriesAfter,2);
 assert.throws(()=>planOnlineRestore({...args,verifiedUserId:B}),/불일치/);
 assert.throws(()=>planOnlineRestore({...args,ownerId:null}),/불일치/);
 assert.throws(()=>validateOnlineBackup({...online,strategies:{x:[{name:'bad',trades:[{side:'sell',ticker:'TSLA',quantity:-1,price:1}]}]}}));
});
test('server review handler uses only owner-filtered reads, not mutations',()=>{
 const html=readFileSync(new URL('../data-management.html',import.meta.url),'utf8');
 const start=html.indexOf("$('restoreOnline').onclick=async()=>{");
 const section=html.slice(start,html.indexOf('\nrender();',start));
 assert.ok(section.includes('planOnlineRestore('));
 assert.equal((section.match(/\.eq\('user_id',userId\)/g)||[]).length,2);
 assert.match(section,/sequence!==fileSequence\|\|authAtStart!==authSequence/);
 assert.doesNotMatch(section,/\.(upsert|insert|update|delete|rpc)\(/);
 assert.match(html,/서버 복원 사전점검/);
});
test('file selection and local restore invalidate stale async input and reject unowned ledger overwrite',()=>{
 const html=readFileSync(new URL('../data-management.html',import.meta.url),'utf8');
 assert.match(html,/const sequence=\+\+fileSequence,authAtStart=authSequence/);
 assert.match(html,/if\(sequence!==fileSequence\|\|authAtStart!==authSequence\)return/);
 assert.match(html,/소유자 미확인 원장은 덮어쓰지 않습니다/);
 assert.match(html,/validateBackupLedger\(ledger\)/);
});
