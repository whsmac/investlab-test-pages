-- TEST only: own personal quote credential and short-lived quote cache.
create table public.investlab_personal_quote_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 api_key text not null check (api_key ~ '^[A-Za-z0-9_-]{10,128}$'),
 quote_cache jsonb not null default '{}'::jsonb check (jsonb_typeof(quote_cache)='object' and octet_length(quote_cache::text)<=40000),
 next_at timestamptz not null default '-infinity',
 lease uuid not null default gen_random_uuid(),
 updated_at timestamptz not null default now()
);
alter table public.investlab_personal_quote_settings enable row level security;
revoke all on public.investlab_personal_quote_settings from public,anon,authenticated;
grant select,insert,update,delete on public.investlab_personal_quote_settings to authenticated;
create policy own_quote_settings_select on public.investlab_personal_quote_settings for select to authenticated using ((select auth.uid())=user_id);
create policy own_quote_settings_insert on public.investlab_personal_quote_settings for insert to authenticated with check ((select auth.uid())=user_id);
create policy own_quote_settings_update on public.investlab_personal_quote_settings for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy own_quote_settings_delete on public.investlab_personal_quote_settings for delete to authenticated using ((select auth.uid())=user_id);
create function public.claim_investlab_personal_quotes_v1() returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.investlab_personal_quote_settings%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 update public.investlab_personal_quote_settings s set next_at=clock_timestamp()+interval '60 seconds',lease=gen_random_uuid() where s.user_id=auth.uid() and s.next_at<=clock_timestamp() returning * into r;
 if found then return jsonb_build_object('connected',true,'claimed',true,'lease',r.lease,'key',r.api_key,'cache',r.quote_cache); end if;
 select * into r from public.investlab_personal_quote_settings s where s.user_id=auth.uid();
 if not found then return jsonb_build_object('connected',false,'claimed',false); end if;
 return jsonb_build_object('connected',true,'claimed',false,'cache',r.quote_cache);
end; $$;
revoke all on function public.claim_investlab_personal_quotes_v1() from public,anon,authenticated;
grant execute on function public.claim_investlab_personal_quotes_v1() to authenticated;
