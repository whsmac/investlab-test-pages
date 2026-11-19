import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../sql/test-ledger-post-opening-v1-REVIEW-DO-NOT-RUN.sql',import.meta.url),'utf8');
test('opening candidate is explicitly blocked until idempotency hash schema is reconciled',()=>{
 assert.match(sql,/REVIEW ONLY \/ DO NOT EXECUTE/);
 assert.match(sql,/BLOCKED: opening idempotency needs dedicated payload_hash column/);
 assert.doesNotMatch(sql,/insert\s+into\s+public\.investlab_ledger_/i);
});
test('opening candidate locks account and scopes owner to auth.uid',()=>{
 assert.match(sql,/v_owner uuid := \(select auth\.uid\(\)\)/);
 assert.match(sql,/where a\.id=p_account_id and a\.user_id=v_owner for update/);
 assert.match(sql,/Opening already posted/);
});
test('rejects anonymous execution and direct caller ownership claims',()=>{
 assert.match(sql,/revoke all on function public\.investlab_post_opening_v1\(uuid,text,jsonb\) from public,anon/);
 assert.doesNotMatch(sql,/p_owner_id|p_user_id/);
});
