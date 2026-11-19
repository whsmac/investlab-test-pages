import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('TEST schema preflight SQL is SELECT-only and references only expected catalog views',()=>{
 const sql=read('docs/sql/READONLY-test-scenario-preflight.sql');
 const executable=sql.split('\n').filter(x=>!x.trim().startsWith('--')).join('\n');
 const statements=executable.split(';').map(x=>x.trim()).filter(Boolean);
 assert.equal(statements.length,6);
 for(const stmt of statements)assert.match(stmt,/^select\b/i);
 assert.doesNotMatch(executable,/\b(insert|update|delete|create|alter|drop|truncate|grant|revoke|do|call|execute|copy)\b/i);
 assert.match(sql,/to_regclass\('public\.test_user_scenarios'\)/);
 assert.match(sql,/pg_policies/);
});
test('preflight audit explicitly blocks schema execution until gaps resolved',()=>{
 const doc=read('docs/TEST-scenario-preflight-findings.md');
 for(const item of ['Nested JSON validation','Assumption key allowlist','Write concurrency','Rollback','two-user isolation','explicit approval'])
  assert.ok(doc.includes(item),item);
 assert.match(doc,/no TEST Supabase SQL executed/);
});
