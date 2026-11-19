import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canonicalOpeningPayload,openingPayloadSha256} from '../src/ledger/opening-payload-hash.mjs';
const sql=readFileSync(new URL('../sql/test-ledger-post-opening-v2-REVIEW-DO-NOT-RUN.sql',import.meta.url),'utf8');
const id='33333333-3333-4333-8333-333333333333';
test('canonical ordering is bytewise, not locale dependent',async()=>{
 const base={accountId:id,requestId:'same',rows:[{assetType:'security',assetCode:'Z',delta:'1',openingCostBasisUsd:'0'},{assetType:'security',assetCode:'A-B',delta:'1',openingCostBasisUsd:'0'},{assetType:'cash',assetCode:'USD',delta:'1'}]};
 const canonical=canonicalOpeningPayload(base);
 assert.ok(canonical.indexOf('"assetCode":"USD"')<canonical.indexOf('"assetCode":"A-B"'));
 assert.ok(canonical.indexOf('"assetCode":"A-B"')<canonical.indexOf('"assetCode":"Z"'));
 assert.equal(await openingPayloadSha256(base),await openingPayloadSha256({...base,rows:base.rows.slice().reverse()}));
});
test('SQL review candidate explicitly uses PostgreSQL C collation',()=>{
 assert.match(sql,/collate "C"/i);
 assert.match(sql,/pgcrypto digest resolution is deployment-specific/);
 assert.match(sql,/real PostgreSQL parity tests/);
});
