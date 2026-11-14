import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../sql/test-ledger-v2-payload-hash-amendment-REVIEW-DO-NOT-RUN.sql',import.meta.url),'utf8');
test('payload hash amendment is review only and keeps historical data safe',()=>{
 assert.match(sql,/REVIEW ONLY \/ DO NOT EXECUTE/);
 assert.match(sql,/alter table public\.investlab_ledger_events\s+add column payload_hash text/i);
 assert.match(sql,/payload_hash is null or payload_hash/);
 assert.doesNotMatch(sql,/\b(drop table|truncate|delete from|update public\.)\b/i);
});
test('explicitly blocks deployment before backfill and rollback verification',()=>{
 assert.match(sql,/Backfill, NOT NULL and migration rollback require separate review/);
 assert.match(sql,/SHA-256 canonical payload/);
});
