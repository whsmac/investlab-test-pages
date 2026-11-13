import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../sql/test-ledger-v2-catalog-preflight-REVIEW-DO-NOT-RUN.sql',import.meta.url),'utf8');
test('read-only catalog preflight checks schema, RLS, hash and RPC permissions',()=>{
 for(const name of ['investlab_accounts','investlab_ledger_events','investlab_ledger_legs','investlab_personal_symbols','investlab_personal_scenarios_v2'])assert.ok(sql.includes(name));
 for(const token of ['relrowsecurity','relforcerowsecurity','payload_hash','extensions','digest','has_function_privilege','anon','authenticated','EXECUTE','unique owner/account/request key'])assert.ok(sql.includes(token));
 assert.match(sql,/READ-ONLY PREFLIGHT \/ REVIEW ONLY \/ DO NOT EXECUTE/);
 assert.match(sql,/live A\/B\/anon and rollback tests STILL REQUIRED/);
});
test('catalog preflight contains no persistent DDL or DML',()=>{
 assert.doesNotMatch(sql,/\b(?:create\s+(?:table|function|policy)|alter\s+table|drop\s+|insert\s+into|update\s+public\.|delete\s+from|truncate\s+)\b/i);
});
