import test from 'node:test';
import assert from 'node:assert/strict';
import {previewLedgerBalanceAfterTransaction as project} from '../src/ledger/ledger-balance-projection.mjs';
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const account='33333333-3333-4333-8333-333333333333',otherAccount='44444444-4444-4444-8444-444444444444';
const eventId='55555555-5555-4555-8555-555555555555';
const accounts=[{id:account,ownerId:user},{id:otherAccount,ownerId:other}];
const opening={id:'open-1',accountId:account,requestId:'open-1',type:'opening',legs:[{assetType:'cash',assetCode:'USD',delta:'1000'},{assetType:'security',assetCode:'TSLA',delta:'3'}]};
const privateOpening={...opening,id:'open-other',accountId:otherAccount,legs:[{assetType:'cash',assetCode:'USD',delta:'9999'}]};
const base={sessionUserId:user,accounts,committedEvents:[opening,privateOpening],eventId};
const run=transaction=>project({...base,transaction});
test('buy updates shares and USD cash without leaking other account',()=>{
 const input={...base,transaction:{kind:'trade',accountId:account,requestId:'buy-1',side:'buy',ticker:'TSLA',quantity:'2',grossUsd:'400'}};
 const snapshot=structuredClone(input),r=project(input);
 assert.equal(r.changes.find(x=>x.accountAsset.endsWith('security:TSLA')).after,'5.00000000');
 assert.equal(r.changes.find(x=>x.accountAsset.endsWith('cash:USD')).after,'600.00000000');
 assert.equal(r.afterBalances.some(x=>x.accountAsset.startsWith(otherAccount)),false);
 assert.equal(r.canPost,false);assert.deepEqual(input,snapshot);
});
test('sell updates shares and USD cash',()=>{
 const r=run({kind:'trade',accountId:account,requestId:'sell-1',side:'sell',ticker:'TSLA',quantity:'1',grossUsd:'250'});
 assert.equal(r.changes.find(x=>x.accountAsset.endsWith('security:TSLA')).after,'2.00000000');
 assert.equal(r.changes.find(x=>x.accountAsset.endsWith('cash:USD')).after,'1250.00000000');
});
test('withdrawal updates KRW cash when present',()=>{
 const committedEvents=[...base.committedEvents,{id:'krw-deposit',accountId:account,requestId:'deposit-krw',type:'deposit',legs:[{assetType:'cash',assetCode:'KRW',delta:'3000'}]}];
 const r=project({...base,committedEvents,transaction:{kind:'cash',accountId:account,requestId:'withdraw-1',type:'withdrawal',currency:'KRW',amount:'500'}});
 assert.equal(r.changes.find(x=>x.accountAsset.endsWith('cash:KRW')).after,'2500.00000000');
});
test('rejects insufficient cash, shares, foreign account and un-opened account',()=>{
 assert.throws(()=>run({kind:'trade',accountId:account,requestId:'buy-1',side:'buy',ticker:'TSLA',quantity:'1',grossUsd:'1001'}),/insufficient/);
 assert.throws(()=>run({kind:'trade',accountId:account,requestId:'sell-1',side:'sell',ticker:'TSLA',quantity:'4',grossUsd:'100'}),/insufficient/);
 assert.throws(()=>run({kind:'cash',accountId:otherAccount,requestId:'dep-1',type:'deposit',currency:'USD',amount:'1'}),/cross-user/);
 assert.throws(()=>project({...base,committedEvents:[],transaction:{kind:'cash',accountId:account,requestId:'dep-1',type:'deposit',currency:'USD',amount:'1'}}),/opening event required/);
});
