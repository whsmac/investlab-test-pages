import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {assessLedgerV2Schema} from '../src/ledger/ledger-v2-schema-review.mjs';
const sql=readFileSync(new URL('../sql/test-ledger-v2-revised-schema-DO-NOT-RUN.sql',import.meta.url),'utf8');
test('revised five-table schema satisfies offline contract',()=>{const r=assessLedgerV2Schema(sql);assert.equal(r.status,'STATIC_CONTRACT_REVIEW_ONLY');assert.deepEqual(r.blockers,[]);assert.equal(r.canExecuteSql,false)});
test('removed multi-leg uniqueness fails contract',()=>{const r=assessLedgerV2Schema(sql.replace('unique(event_id,asset_type,asset_code)','unique(event_id,asset_type)'));assert.ok(r.blockers.includes('multi_leg'))});
test('missing force RLS fails contract',()=>{const r=assessLedgerV2Schema(sql.replace('alter table public.investlab_accounts force row level security;',''));assert.ok(r.blockers.includes('all_force_rls'))});
test('write grant fails contract',()=>{const r=assessLedgerV2Schema(sql.replace('grant select on public.investlab_accounts','grant insert on public.investlab_accounts'));assert.ok(r.blockers.includes('read_only_grants'))});
