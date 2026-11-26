-- TEST ONLY: investlab-ledger-test (gopofxyezhwpfxbecrxd).
create table public.investlab_strategy_tracker_documents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision integer not null default 1 check (revision > 0),
 payload jsonb not null check (
 jsonb_typeof(payload) = 'object' and payload ? 'version' and payload->'version' = '1'::jsonb
 and payload ? 'strategies' and jsonb_typeof(payload->'strategies') = 'array'
 and jsonb_array_length(payload->'strategies') <= 100 and octet_length(payload::text) <= 1048576),
 updated_at timestamptz not null default now()
);
alter table public.investlab_strategy_tracker_documents enable row level security;
revoke all on public.investlab_strategy_tracker_documents from public, anon, authenticated;
grant select, insert, update on public.investlab_strategy_tracker_documents to authenticated;
create policy tracker_select_own on public.investlab_strategy_tracker_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy tracker_insert_own on public.investlab_strategy_tracker_documents for insert to authenticated with check ((select auth.uid()) = user_id and revision = 1);
create policy tracker_update_own on public.investlab_strategy_tracker_documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
