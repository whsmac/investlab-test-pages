import test from 'node:test';
import assert from 'node:assert/strict';
import {planAccountCreation,planOpeningAfterAccountCreated,planLedgerPostingAfterOpening} from '../src/ledger/ledger-staged-onboarding.mjs';
const id='33333333-3333-4333-8333-333333333333';
test('account creation never assumes a client-generated account id',()=>{
 const p=planAccountCreation({name:'ISA',requestId:'account-1'});
 assert.deepEqual(p.args,{p_name:'ISA',p_request_id:'account-1'});
 assert.equal(p.canExecute,false);
 assert.ok(!('p_account_id' in p.args));
});
test('opening waits for confirmed server account creation',async()=>{
 const base={accountId:id,name:'ISA',requestId:'open-1',ownerConfirmed:true,cash:[{accountId:id,currency:'USD',balance:'500'}]};
 await assert.rejects(()=>planOpeningAfterAccountCreated(base),/not confirmed/);
 const p=await planOpeningAfterAccountCreated({...base,accountCreated:true});
 assert.equal(p.args.p_account_id,id);
 assert.match(p.args.p_payload_hash,/^[0-9a-f]{64}$/);
 assert.equal(p.canExecute,false);
});
test('ledger posting cannot precede opening and does not fabricate RPC arguments',()=>{
 assert.throws(()=>planLedgerPostingAfterOpening({accountId:id,events:[{}]}),/not confirmed/);
 const p=planLedgerPostingAfterOpening({accountId:id,openingEventId:id,openingCommitted:true,events:[{}]});
 assert.equal(p.next,'REVIEW_TRADE_CASH_RPC_CONTRACTS');
 assert.equal(p.canExecute,false);
 assert.ok(!('rpc' in p));
});
