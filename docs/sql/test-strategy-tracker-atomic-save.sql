-- TEST ONLY. Atomic compare-and-save while holding the caller's ledger row lock.
create function public.save_investlab_tracker_v1(expected_revision integer, expected_ledger_stamp timestamptz, new_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); stamp timestamptz; saved public.investlab_strategy_tracker_documents%rowtype;
begin
 if uid is null then raise exception 'authentication required' using errcode='42501'; end if;
 if expected_revision is null or expected_revision<0 or expected_ledger_stamp is null or new_payload is null then raise exception 'invalid save request' using errcode='22023'; end if;
 select l.updated_at into stamp from public.investlab_pilot_ledger_documents l where l.user_id=uid for share;
 if not found or stamp is distinct from expected_ledger_stamp then raise exception 'ledger changed; reload' using errcode='40001'; end if;
 if expected_revision=0 then
  insert into public.investlab_strategy_tracker_documents(user_id,revision,payload,updated_at) values(uid,1,new_payload,clock_timestamp()) on conflict(user_id) do nothing returning * into saved;
 else
  update public.investlab_strategy_tracker_documents d set revision=d.revision+1,payload=new_payload,updated_at=clock_timestamp() where d.user_id=uid and d.revision=expected_revision returning * into saved;
 end if;
 if not found then raise exception 'strategy revision changed; reload' using errcode='40001'; end if;
 return jsonb_build_object('revision',saved.revision,'payload',saved.payload,'updated_at',saved.updated_at);
end; $$;
revoke all on function public.save_investlab_tracker_v1(integer,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.save_investlab_tracker_v1(integer,timestamptz,jsonb) to authenticated;
