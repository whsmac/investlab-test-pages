import test from 'node:test';
import assert from 'node:assert/strict';
import {previewLedgerOnboarding as preview} from '../src/ledger/ledger-onboarding-flow.mjs';
const uid='11111111-1111-4111-8111-111111111111',aid='33333333-3333-4333-8333-333333333333';
const account={id:aid,name:'Retirement',ownerConfirmed:true};
const opening={id:'opening',accountId:aid,requestId:'initial',type:'opening',legs:[{assetType:'cash',assetCode:'USD',delta:'1000'}]};
const buy={id:'buy',accountId:aid,requestId:'trade-1',type:'buy',legs:[{assetType:'cash',assetCode:'USD',delta:'-200'},{assetType:'security',assetCode:'TSLA',delta:'1'}]};
const base={sessionUserId:uid,account,requestId:'test123',cash:[{accountId:aid,currency:'USD',balance:'1000'}]};
test('account and opening preview cannot execute SQL',()=>{
 const result=preview(base);assert.equal(result.onboarding.rpc,'investlab_create_account_v1');assert.equal(result.opening.rpc,'investlab_post_opening_v1');assert.equal(result.canExecute,false);assert.equal(result.posting,null);
});
test('posting after committed opening preserves cash and shares',()=>{
 const result=preview({...base,committedEvents:[opening],proposedEvents:[buy]});
 assert.equal(result.posting.applied,1);assert.equal(result.posting.balances.find(x=>x.accountAsset===aid+' / cash:USD').balance,'800.00000000');
});
test('cannot post before committed opening',()=>assert.throws(()=>preview({...base,proposedEvents:[buy]}),/committed opening/));
test('client cannot assert ownership',()=>assert.throws(()=>preview({...base,account:{...account,ownerId:uid}}),/owner must come/));
test('unconfirmed account cannot be onboarded',()=>assert.throws(()=>preview({...base,account:{...account,ownerConfirmed:false}}),/confirmation/));

test('rejects malformed or missing request ID before generating RPC previews',()=>{
 for(const requestId of [undefined,'','../bad path'])assert.throws(()=>preview({...base,requestId}),/request ID/);
});
test('cannot treat arbitrary committed trade as an opening',()=>{
 assert.throws(()=>preview({...base,committedEvents:[buy],proposedEvents:[buy]}),/committed opening/);
});
test('cannot treat another account opening as this account opening',()=>{
 const other='44444444-4444-4444-8444-444444444444';
 assert.throws(()=>preview({...base,committedEvents:[{...opening,accountId:other}],proposedEvents:[buy]}),/committed opening/);
});
