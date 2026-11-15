import test from 'node:test';import assert from 'node:assert/strict';import {buildHoldingDetail as detail} from '../src/ledger/holding-detail.mjs';
const u='11111111-1111-4111-8111-111111111111',a='33333333-3333-4333-8333-333333333333',b='44444444-4444-4444-8444-444444444444';
const base={sessionUserId:u,accounts:[{id:a,ownerId:u,name:'ISA'},{id:b,ownerId:u,name:'Pension'}],committedEvents:[{id:'a',accountId:a,requestId:'a',type:'opening',legs:[{assetType:'security',assetCode:'TSLA',delta:'3'}]},{id:'b',accountId:b,requestId:'b',type:'opening',legs:[{assetType:'security',assetCode:'TSLA',delta:'2'}]}]};
test('aggregate detail shows two account quantities',()=>{const r=detail(base,'tsla');assert.equal(r.accountCount,2);assert.equal(r.totalQuantityDisplay,'5');assert.equal(r.canPersist,false);});
test('selected account scope does not expose other account rows',()=>{const r=detail({...base,selectedAccountId:a},'TSLA');assert.equal(r.accountCount,1);assert.equal(r.totalQuantityDisplay,'3');});
test('unknown holding rejected',()=>assert.throws(()=>detail(base,'SOXL'),/not held/));
