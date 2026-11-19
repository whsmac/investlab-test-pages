import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/sql/PROPOSAL-test-user-scenarios-rls.sql',import.meta.url),'utf8');
const doc=readFileSync(new URL('../docs/TEST-scenario-online-storage-review.md',import.meta.url),'utf8');
test('proposal is isolated from production and requires authenticated ownership RLS',()=>{
 assert.match(sql,/DO NOT execute/);
 assert.match(sql,/create table if not exists public\.test_user_scenarios/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/force row level security/);
 assert.match(sql,/revoke all on public\.test_user_scenarios from public,anon/);
 for(const action of ['select','insert','update','delete'])assert.match(sql,new RegExp('create policy test_user_scenarios_'+action+'_own'));
 assert.match(sql,/owner_id = \(select auth\.uid\(\)\)/);
});
test('proposal excludes ledger snapshots and documents pending gates',()=>{
 assert.match(sql,/test_user_scenarios_no_ledger_snapshot/);
 for(const field of ['positions','holdings','cashBalance','averageCost','transactions'])assert.ok(sql.includes("'"+field+"'"));
 assert.match(doc,/NOT APPLIED/);
 assert.match(doc,/two independent TEST users/);
 assert.match(doc,/explicit user approval/);
});
