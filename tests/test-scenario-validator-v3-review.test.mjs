import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/sql/PROPOSAL-test-scenario-validator-v3-rollback-only.sql',import.meta.url),'utf8');
test('v3 validator is clearly non-deployable and rollback-only',()=>{
 assert.match(sql,/DO NOT EXECUTE/);
 assert.match(sql,/^begin;/m);
 assert.match(sql,/^rollback;/m);
 assert.doesNotMatch(sql,/^commit;/m);
 assert.doesNotMatch(sql,/create table|insert into|update public|delete from|grant execute/i);
});
test('v3 validator checks types before casts and handles malformed values',()=>{
 for(const token of ["jsonb_typeof(s->'quantity')","jsonb_typeof(s->'price')","jsonb_typeof(s->'fee')","jsonb_typeof(v)","exception when others","jsonb_array_length(steps)>100","jsonb_object_keys","return false"])assert.ok(sql.includes(token),token);
});
