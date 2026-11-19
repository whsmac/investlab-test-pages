import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMultiUserLedgerFixture as check} from '../src/ledger/multi-user-ledger-isolation.mjs';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333',D='44444444-4444-4444-8444-444444444444';
const accounts=[{id:C,ownerId:A},{id:D,ownerId:B}];
const opening=(accountId,cash)=>({id:'opening',accountId,requestId:'same-request',type:'opening',legs:[{assetType:'cash',assetCode:'USD',delta:cash}]});
const events=[opening(C,'100'),opening(D,'900')];
test('two users may reuse request/event IDs while balances stay isolated',()=>{
 const input={accounts,events,sessionUserId:A},before=structuredClone(input);
 const a=check(input),b=check({...input,sessionUserId:B});
 assert.equal(a.visible.balances[0].balance,'100.00000000');
 assert.equal(b.visible.balances[0].balance,'900.00000000');
 assert.equal(a.visible.accountCount,1);
 assert.equal(a.canPost,false);
 assert.equal(a.serverVerified,false);
 assert.deepEqual(input,before);
});
test('user without accounts sees no private balances',()=>{
 const x=check({accounts,events,sessionUserId:'55555555-5555-4555-8555-555555555555'});
 assert.deepEqual(x.visible.balances,[]);
});
test('rejects spoofed owner supplied by client event',()=>{
 assert.throws(()=>check({accounts,events:[{...events[0],userId:B}],sessionUserId:A}),/owner forbidden/);
});
test('rejects duplicate account IDs and unknown account events',()=>{
 assert.throws(()=>check({accounts:[accounts[0],accounts[0]],events:[],sessionUserId:A}),/duplicate account/);
 assert.throws(()=>check({accounts,events:[opening(A,'5')],sessionUserId:A}),/unknown account/);
});
test('same owner cannot duplicate event ID across accounts',()=>{
 const extra='66666666-6666-4666-8666-666666666666';
 assert.throws(()=>check({accounts:[...accounts,{id:extra,ownerId:A}],events:[events[0],opening(extra,'1')],sessionUserId:A}),/duplicate event ID/);
});
