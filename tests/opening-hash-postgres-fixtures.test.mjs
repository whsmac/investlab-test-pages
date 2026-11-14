import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openingPayloadSha256} from '../src/ledger/opening-payload-hash.mjs';
const sql=readFileSync(new URL('../sql/test-opening-hash-postgres-parity-REVIEW-DO-NOT-RUN.sql',import.meta.url),'utf8');
const accountId='33333333-3333-4333-8333-333333333333';
test('PostgreSQL parity fixtures match actual JS SHA-256',async()=>{
 const fixtures=[
  {hash:'f0569a9df45b150dda65d0eb185bfd3322b47e470303d6426aa770f9ea3c335d',rows:[{assetType:'cash',assetCode:'USD',delta:'500'}]},
  {hash:'13ad14800a8249d377a88cff6726e8fb8abaa77a6eb0a6828f12aee0550cf4ef',rows:[{assetType:'security',assetCode:'TSLA',delta:'2',openingCostBasisUsd:'100'},{assetType:'cash',assetCode:'KRW',delta:'1200'}]}
 ];
 for(const f of fixtures){assert.equal(await openingPayloadSha256({accountId,requestId:'open-1',rows:f.rows}),f.hash);assert.ok(sql.includes(f.hash));}
});
test('PostgreSQL parity probe has no write operations',()=>{
 assert.match(sql,/REVIEW ONLY \/ DO NOT EXECUTE/);
 assert.match(sql,/raise exception 'opening SHA-256 parity mismatch/);
 assert.doesNotMatch(sql,/\b(?:insert\s+into|update\s+public\.|delete\s+from|alter\s+table|create\s+function|drop\s+table)\b/i);
});
