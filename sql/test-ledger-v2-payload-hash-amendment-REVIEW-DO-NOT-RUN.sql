-- INVESTLAB TEST v2 PAYLOAD HASH SCHEMA AMENDMENT — REVIEW ONLY / DO NOT EXECUTE
-- This is a candidate ALTER for a future verified TEST v2 install, NOT an approved migration.
-- Preflight must verify current table/constraints, function owner, privileges and backup.
begin;
alter table public.investlab_ledger_events
 add column payload_hash text;
alter table public.investlab_ledger_events
 add constraint investlab_ledger_events_payload_hash_format
 check (payload_hash is null or payload_hash ~ '^[0-9a-f]{64}$');
-- NULL permitted for historical rows pending verified backfill; new RPCs must require non-null.
-- SHA-256 canonical payload must include event type, account, request ID and normalized legs.
-- Hash alone does not validate semantics: server must check request replay against stored legs.
commit;
-- STOP: no Supabase execution. Backfill, NOT NULL and migration rollback require separate review.
