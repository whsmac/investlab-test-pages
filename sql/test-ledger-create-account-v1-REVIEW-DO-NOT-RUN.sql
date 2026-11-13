-- INVESTLAB TEST: ACCOUNT ONBOARDING RPC CANDIDATE — REVIEW ONLY / DO NOT EXECUTE
-- Requires five-table v2 schema; never run against production.
-- This SQL file is intentionally not a migration or deployment instruction.
-- SECURITY DEFINER ownership, grants, RLS, A/B/anon and rollback remain unverified.
begin;
create or replace function public.investlab_create_account_v1(
 p_request_id text,
 p_name text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_owner uuid := (select auth.uid());
 v_id uuid;
 v_existing_name text;
begin
 if v_owner is null then
  raise exception 'Authentication required' using errcode='28000';
 end if;
 if p_request_id is null or p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'
    or p_name is null or length(btrim(p_name)) not between 1 and 100 then
  raise exception 'Invalid account request' using errcode='22023';
 end if;
 -- Serialize retries for the same authenticated owner + request ID.
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(v_owner::text || ':' || p_request_id, 0)
 );
 select a.id,a.name into v_id,v_existing_name
 from public.investlab_accounts a
 where a.user_id=v_owner and a.request_id=p_request_id;
 if found then
  if v_existing_name<>btrim(p_name) then
   raise exception 'Conflicting request ID' using errcode='23505';
  end if;
  return v_id;
 end if;
 insert into public.investlab_accounts(user_id,name,request_id)
 values(v_owner,btrim(p_name),p_request_id)
 returning id into v_id;
 return v_id;
end;
$$;
-- PUBLIC has EXECUTE by default on new PostgreSQL functions: revoke in same transaction.
revoke all on function public.investlab_create_account_v1(text,text) from public,anon;
grant execute on function public.investlab_create_account_v1(text,text) to authenticated;
commit;
-- STOP: no execution authorization. Dedicated function owner and catalog audits required.
