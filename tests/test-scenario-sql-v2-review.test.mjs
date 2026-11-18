import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/sql/PROPOSAL-test-user-scenarios-v2-review-only.sql',import.meta.url),'utf8');
test('v2 SQL is marked review-only and blocks authenticated writes',()=>{
 assert.match(sql,/DO NOT EXECUTE/);
 assert.match(sql,/revoke all on public\.test_user_scenarios from public,anon,authenticated/);
 assert.match(sql,/grant select on public\.test_user_scenarios to authenticated/);
 assert.doesNotMatch(sql,/create policy .*_(insert|update|delete)_own/);
 assert.doesNotMatch(sql,/grant (insert|update|delete|all) on public\.test_user_scenarios/i);
});
test('v2 proposal defines RLS, revision and constrained JSON',()=>{
 for(const part of ['revision bigint','test_scenario_payload_shape','test_scenario_size','test_scenario_owner_name_unique','enable row level security','force row level security','jsonb_object_keys','octet_length'])assert.ok(sql.includes(part),part);
 assert.doesNotMatch(sql,/jsonb_object_length/);
});
