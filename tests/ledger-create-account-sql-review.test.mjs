import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../sql/test-ledger-create-account-v1-REVIEW-DO-NOT-RUN.sql',import.meta.url),'utf8');
test('account RPC is review only and owner derived from auth.uid',()=>{
 assert.match(sql,/REVIEW ONLY \/ DO NOT EXECUTE/);
 assert.match(sql,/v_owner uuid := \(select auth\.uid\(\)\)/);
 assert.doesNotMatch(sql,/p_user_id|p_owner_id/i);
});
test('idempotency is scoped to authenticated owner and request',()=>{
 assert.match(sql,/where a\.user_id=v_owner and a\.request_id=p_request_id/);
 assert.match(sql,/v_existing_name<>btrim\(p_name\)/);
 assert.match(sql,/pg_catalog\.pg_advisory_xact_lock/);
});
test('RPC grants do not authorize anon or public execution',()=>{
 assert.match(sql,/security definer[\s\S]*set search_path = ''/i);
 assert.match(sql,/revoke all on function public\.investlab_create_account_v1\(text,text\) from public,anon/i);
 assert.match(sql,/grant execute on function public\.investlab_create_account_v1\(text,text\) to authenticated/i);
 assert.match(sql,/\bbegin;[\s\S]*\bcommit;/);
});
