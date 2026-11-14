import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessLedgerSchemaCandidate as assess,PERSONAL_TABLES} from '../src/ledger/ledger-schema-contract-v2.mjs';
const sql=readFileSync(new URL('../sql/test-ledger-v2-revised-schema-DO-NOT-RUN.sql',import.meta.url),'utf8');
test('revised five-table TEST schema passes static owner-isolation checks without deployment authorization',()=>{
 const r=assess(sql);assert.equal(r.status,'STATIC_REVIEW_PASSED_NOT_DEPLOYABLE');assert.deepEqual(r.problems,[]);assert.equal(r.tableCount,5);assert.equal(r.canDeploy,false);assert.equal(r.serverVerified,false);
});
test('detects missing owner RLS and unauthorized client writes',()=>{
 const broken=sql.replace('alter table public.investlab_accounts force row level security;','')+'\ngrant insert on public.investlab_accounts to authenticated;';
 const r=assess(broken);assert.ok(r.problems.some(p=>p.includes('FORCE RLS')));assert.ok(r.problems.some(p=>p.includes('unsafe direct')));
});
test('detects missing cross-owner foreign keys',()=>{
 const broken=sql.replace('foreign key(account_id,user_id) references public.investlab_accounts(id,user_id)','foreign key(account_id) references public.investlab_accounts(id)');
 assert.ok(assess(broken).problems.some(p=>p.includes('owner-scoped account FK')));
});
test('planned contract retains exactly five personal tables',()=>assert.equal(new Set(PERSONAL_TABLES).size,5));
