import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditOpeningRpcContract as audit} from '../src/ledger/opening-rpc-contract-audit.mjs';
import {buildOpeningRpcHashPreview} from '../src/ledger/opening-rpc-hash-preview.mjs';
const id='33333333-3333-4333-8333-333333333333';
const base={requestId:'open-1',accounts:[{id,name:'TEST',ownerConfirmed:true}],positions:[{accountId:id,ticker:'TSLA',quantity:'2',averageCostUsd:'100'}],cash:[{accountId:id,currency:'USD',balance:'500'}]};
const sql=readFileSync(new URL('../sql/test-ledger-post-opening-v1-REVIEW-DO-NOT-RUN.sql',import.meta.url),'utf8');
test('existing SQL fails closed on client/server hash parameter mismatch',async()=>{
 const preview=await buildOpeningRpcHashPreview(base);
 const result=audit({sql,preview});
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.blockers.some(x=>x.includes('p_payload_hash')));
 assert.ok(result.blockers.some(x=>x.includes('independent server-side SHA-256')));
 assert.equal(result.canExecute,false);
});
test('no client hash can bypass missing server verification',async()=>{
 const preview=await buildOpeningRpcHashPreview(base);
 const patched=sql.replace('p_rows jsonb','p_rows jsonb, p_payload_hash text');
 const result=audit({sql:patched,preview});
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.blockers.some(x=>x.includes('independent server-side SHA-256')));
});
