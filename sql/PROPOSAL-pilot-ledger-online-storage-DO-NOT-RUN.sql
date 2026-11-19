-- INVESTLAB TEST Pilot online ledger storage: PROPOSAL ONLY. DO NOT EXECUTE without approval.
-- TEST project only: gopofxyezhwpfxbecrxd. No production use.
-- One owner-scoped JSON document per authenticated user. Later normalize to event tables.
begin;
create table if not exists public.investlab_pilot_ledger_documents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (
  jsonb_typeof(payload)='object'
  and payload->>'version'='1'
  and jsonb_typeof(payload->'accounts')='array'
  and jsonb_typeof(payload->'entries')='array'
  and pg_column_size(payload)<=1048576
 ),
 updated_at timestamptz not null default now()
);
alter table public.investlab_pilot_ledger_documents enable row level security;
alter table public.investlab_pilot_ledger_documents force row level security;
revoke all on public.investlab_pilot_ledger_documents from public,anon,authenticated;
grant select,insert,update on public.investlab_pilot_ledger_documents to authenticated;
create policy pilot_read_own on public.investlab_pilot_ledger_documents
 for select to authenticated using ((select auth.uid())=user_id);
create policy pilot_insert_own on public.investlab_pilot_ledger_documents
 for insert to authenticated with check ((select auth.uid())=user_id);
create policy pilot_update_own on public.investlab_pilot_ledger_documents
 for update to authenticated using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id);
commit;
-- STOP: approval required. No automatic migration, no service-role keys.
