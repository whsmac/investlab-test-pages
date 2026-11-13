import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOpeningRpcHashPreview as build} from '../src/ledger/opening-rpc-hash-preview.mjs';
const id='33333333-3333-4333-8333-333333333333';
const base={requestId:'open-1',accounts:[{id,name:'TEST',ownerConfirmed:true}],positions:[{accountId:id,ticker:'TSLA',quantity:'2',averageCostUsd:'100'}],cash:[{accountId:id,currency:'USD',balance:'500'}]};
test('opening snapshot maps to canonical RPC arguments without sending',async()=>{
 const r=await build(base);assert.equal(r.rpc,'investlab_post_opening_v1');assert.equal(r.args.p_rows.length,2);
 assert.equal(r.args.p_payload_hash.length,64);assert.equal(r.canExecute,false);assert.equal(r.serverVerified,false);
 assert.equal(r.args.p_account_id,id);
});
test('equivalent decimal formats yield same hash',async()=>{
 const a=await build(base),b=await build({...base,positions:[{...base.positions[0],quantity:'2.0',averageCostUsd:'100.000'}],cash:[{...base.cash[0],balance:'500.00'}]});
 assert.equal(a.args.p_payload_hash,b.args.p_payload_hash);
});
test('changing cost basis changes hash',async()=>{
 const a=await build(base),b=await build({...base,positions:[{...base.positions[0],averageCostUsd:'101'}]});
 assert.notEqual(a.args.p_payload_hash,b.args.p_payload_hash);
});
test('client cannot override ownership or hash',async()=>{
 await assert.rejects(()=>build({...base,userId:id}),/owner and payload hash/);
 await assert.rejects(()=>build({...base,payloadHash:'f'.repeat(64)}),/owner and payload hash/);
});
