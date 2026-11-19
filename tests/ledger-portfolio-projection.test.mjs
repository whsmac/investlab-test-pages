import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPortfolioFromLedger as project} from '../src/ledger/ledger-portfolio-projection.mjs';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const X='33333333-3333-4333-8333-333333333333',Y='44444444-4444-4444-8444-444444444444',Z='55555555-5555-4555-8555-555555555555';
const accounts=[{id:X,ownerId:A,name:'ISA'},{id:Y,ownerId:A,name:'Pension'},{id:Z,ownerId:B,name:'Private'}];
const opening=(id,requestId,legs)=>({id:requestId,accountId:id,requestId,type:'opening',legs});
const cash=n=>({assetType:'cash',assetCode:'USD',delta:n});
const sec=(ticker,n)=>({assetType:'security',assetCode:ticker,delta:n});
const events=[opening(X,'open-x',[cash('1000'),sec('TSLA','3')]),opening(Y,'open-y',[cash('200'),sec('TSLA','2')]),opening(Z,'open-z',[cash('9999'),sec('SOXL','100')]),{id:'buy-x',accountId:X,requestId:'buy-x',type:'buy',legs:[cash('-400'),sec('TSLA','2')]},{id:'sell-y',accountId:Y,requestId:'sell-y',type:'sell',legs:[cash('100'),sec('TSLA','-1')]}];
test('one ledger produces account holdings and consolidated portfolio without other users',()=>{
 const input={sessionUserId:A,accounts,committedEvents:events},before=structuredClone(input),p=project(input);
 assert.equal(p.accounts.length,2);
 assert.deepEqual(p.positions,[{ticker:'TSLA',quantity:'6.00000000'}]);
 assert.deepEqual(p.cash,[{currency:'USD',balance:'900.00000000'}]);
 assert.equal(p.accounts.find(a=>a.accountId===X).positions[0].quantity,'5.00000000');
 assert.equal(p.accounts.find(a=>a.accountId===Y).positions[0].quantity,'1.00000000');
 assert.equal(p.accounts.some(a=>a.accountId===Z),false);
 assert.equal(p.canPersist,false);assert.deepEqual(input,before);
});
test('rejected oversell cannot produce a portfolio snapshot',()=>{
 const oversell={id:'bad',accountId:X,requestId:'bad',type:'sell',legs:[cash('100'),sec('TSLA','-999')]};
 assert.throws(()=>project({sessionUserId:A,accounts,committedEvents:[...events,oversell]}),/insufficient balance/);
});
test('unknown account and spoofed event owner rejected',()=>{
 assert.throws(()=>project({sessionUserId:A,accounts,committedEvents:[{...events[0],accountId:'66666666-6666-4666-8666-666666666666'}]}),/unknown event account/);
 assert.throws(()=>project({sessionUserId:A,accounts,committedEvents:[{...events[0],userId:A}]}),/owner forbidden/);
});
