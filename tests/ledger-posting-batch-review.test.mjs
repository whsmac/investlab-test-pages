import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPostingBatch as review} from '../src/ledger/ledger-posting-batch-review.mjs';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const X='33333333-3333-4333-8333-333333333333',Y='44444444-4444-4444-8444-444444444444';
const accounts=[{id:X,ownerId:A},{id:Y,ownerId:B}];
const opening=(accountId,amount)=>({id:'open-'+accountId,accountId,requestId:'opening',type:'opening',legs:[{assetType:'cash',assetCode:'USD',delta:amount}]});
const buy=(accountId,amount='-40',quantity='1')=>({id:'buy-'+accountId,accountId,requestId:'buy-1',type:'buy',legs:[{assetType:'cash',assetCode:'USD',delta:amount},{assetType:'security',assetCode:'TSLA',delta:quantity}]});
const base=()=>({sessionUserId:A,accounts,committedEvents:[opening(X,'100'),opening(Y,'900')],proposedEvents:[buy(X)]});
test('account owner only sees own balances and may review valid trade',()=>{
 const input=base(),before=structuredClone(input),r=review(input);
 assert.equal(r.applied,1);assert.equal(r.balances.find(x=>x.accountAsset===X+' / cash:USD').balance,'60.00000000');
 assert.equal(r.balances.some(x=>x.accountAsset.startsWith(Y)),false);
 assert.equal(r.canPost,false);assert.equal(r.atomicityVerified,false);assert.deepEqual(input,before);
});
test('blocks cross-owner trade, spoofed owner and unknown account',()=>{
 assert.throws(()=>review({...base(),proposedEvents:[buy(Y)]}),/cross-user/);
 assert.throws(()=>review({...base(),proposedEvents:[{...buy(X),userId:A}]}),/owner forbidden/);
 assert.throws(()=>review({...base(),proposedEvents:[buy(A)]}),/unknown account/);
});
test('rejects insufficient funds and insufficient shares in proposed batch',()=>{
 assert.throws(()=>review({...base(),proposedEvents:[buy(X,'-101')]}),/insufficient balance/);
 const sell={id:'sell',accountId:X,requestId:'sell-1',type:'sell',legs:[{assetType:'cash',assetCode:'USD',delta:'10'},{assetType:'security',assetCode:'TSLA',delta:'-1'}]};
 assert.throws(()=>review({...base(),proposedEvents:[sell]}),/insufficient balance/);
});
test('same request replay is idempotent, conflicting replay is rejected',()=>{
 const first=buy(X),input=base();
 const r=review({...input,committedEvents:[...input.committedEvents,first],proposedEvents:[first]});
 assert.equal(r.idempotentRetries,1);assert.equal(r.applied,0);
 assert.throws(()=>review({...input,committedEvents:[...input.committedEvents,first],proposedEvents:[{...first,id:'another-id'}]}),/conflicting request ID/);
});
test('invalid second trade prevents any successful review result',()=>{
 const bad={...buy(X,'-70','2'),id:'second',requestId:'buy-2'};
 assert.throws(()=>review({...base(),proposedEvents:[buy(X),bad]}),/insufficient balance/);
});
