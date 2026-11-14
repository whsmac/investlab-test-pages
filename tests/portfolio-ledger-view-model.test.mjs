import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPortfolioLedgerView as view} from '../src/ledger/portfolio-ledger-view-model.mjs';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const X='33333333-3333-4333-8333-333333333333',Y='44444444-4444-4444-8444-444444444444',Z='55555555-5555-4555-8555-555555555555';
const accounts=[{id:X,ownerId:A,name:'ISA'},{id:Y,ownerId:A,name:'Pension'},{id:Z,ownerId:B,name:'Private'}];
const opening=(accountId,id,legs)=>({id,accountId,requestId:id,type:'opening',legs});
const events=[opening(X,'open-x',[{assetType:'cash',assetCode:'USD',delta:'1000'},{assetType:'security',assetCode:'TSLA',delta:'3'}]),opening(Y,'open-y',[{assetType:'cash',assetCode:'KRW',delta:'10000'},{assetType:'security',assetCode:'TSLA',delta:'2'}]),opening(Z,'open-z',[{assetType:'cash',assetCode:'USD',delta:'9999'}])];
const base={sessionUserId:A,accounts,committedEvents:events};
test('portfolio and ledger share one source and aggregate holdings',()=>{
 const input=structuredClone(base),p=view(input);
 assert.equal(p.source,'UNIFIED_LEDGER_EVENTS');
 assert.equal(p.totalAccountCount,2);
 assert.deepEqual(p.holdings,[{ticker:'TSLA',quantity:'5.00000000',quantityDisplay:'5'}]);
 assert.equal(p.cash.find(x=>x.currency==='USD').balance,'1000.00000000');
 assert.equal(p.cash.find(x=>x.currency==='KRW').balance,'10000.00000000');
 assert.equal(p.valuationAvailable,false);assert.equal(p.profitLossAvailable,false);
 assert.deepEqual(input,base);
});
test('account selection filters holdings and cash without leaking other users',()=>{
 const p=view({...base,selectedAccountId:Y});
 assert.deepEqual(p.holdings,[{ticker:'TSLA',quantity:'2.00000000',quantityDisplay:'2'}]);
 assert.deepEqual(p.cash,[{currency:'KRW',balance:'10000.00000000'}]);
 assert.throws(()=>view({...base,selectedAccountId:Z}),/not owned/);
});
test('zero positions are not displayed and no server writes are authorized',()=>{
 const p=view({...base,committedEvents:[...events,{id:'sell-x',accountId:X,requestId:'sell-x',type:'sell',legs:[{assetType:'security',assetCode:'TSLA',delta:'-3'},{assetType:'cash',assetCode:'USD',delta:'500'}]}],selectedAccountId:X});
 assert.deepEqual(p.holdings,[]);
 assert.equal(p.cash[0].balance,'1500.00000000');
 assert.equal(p.canPersist,false);
});
