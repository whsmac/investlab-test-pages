-- Disposable PostgreSQL fixture only. Never install in Supabase.
-- Numeric domain intentionally bounded; compatibility with real backups remains gated.
create function restore_fixture.checked_number(v jsonb, allow_string boolean default false)
returns numeric language plpgsql immutable security invoker set search_path=''
as $fn$
declare n numeric; t text;
begin
 if jsonb_typeof(v) is distinct from 'number'
    and not (allow_string and jsonb_typeof(v) is not distinct from 'string') then
  raise exception 'invalid numeric field' using errcode='22023';
 end if;
 t:=v#>>'{}';
 if char_length(t)>80 or t !~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]{1,2})?$' then
  raise exception 'invalid numeric text' using errcode='22023';
 end if;
 n:=t::numeric;
 if abs(n)>1000000000000000 then raise exception 'numeric bound' using errcode='22023'; end if;
 return n;
end;
$fn$;

create function restore_fixture.validate_ledger_domain(p jsonb)
returns void language plpgsql immutable security invoker set search_path=''
as $fn$
declare a jsonb; e jsonb; ids jsonb:='{}'; seen jsonb:='{}'; positions jsonb:='{}'; cash jsonb:='{}';
 aid text; eid text; kind text; cur text; sym text; k text; dt text; d date;
 qty numeric; price numeric; amt numeric; next_value numeric; delta numeric; received numeric;
begin
 if p is null then return; end if;
 if jsonb_typeof(p) is distinct from 'object' or p->'version' is distinct from '1'::jsonb
    or jsonb_typeof(p->'accounts') is distinct from 'array'
    or jsonb_typeof(p->'entries') is distinct from 'array' then
  raise exception 'invalid ledger shape' using errcode='22023';
 end if;
 if jsonb_array_length(p->'accounts')>100 or jsonb_array_length(p->'entries')>5000 then
  raise exception 'fixture ledger quota' using errcode='22023';
 end if;
 for a in select value from jsonb_array_elements(p->'accounts') loop
  aid:=a->>'id';
  if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(a->'id') is distinct from 'string'
     or coalesce(char_length(aid),0) not between 1 and 128 or aid in ('__proto__','constructor','prototype')
     or ids?aid or jsonb_typeof(a->'name') is distinct from 'string' or coalesce(char_length(btrim(a->>'name')),0) not between 1 and 80 then
   raise exception 'invalid or duplicate account' using errcode='22023';
  end if;
  ids:=ids||jsonb_build_object(aid,true);
 end loop;
 -- Validate every field used in sorting before replay; date then created then array index.
 for e in select value from jsonb_array_elements(p->'entries') loop
  eid:=e->>'id'; aid:=e->>'accountId'; dt:=e->>'date';
  if jsonb_typeof(e) is distinct from 'object' or jsonb_typeof(e->'id') is distinct from 'string'
     or coalesce(char_length(eid),0) not between 1 and 128 or seen?eid
     or jsonb_typeof(e->'accountId') is distinct from 'string' or not coalesce(ids?aid,false)
     or jsonb_typeof(e->'date') is distinct from 'string' or coalesce(dt,'') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
   raise exception 'invalid entry identity' using errcode='22023';
  end if;
  begin d:=dt::date;
  exception when datetime_field_overflow or invalid_datetime_format then
   raise exception 'invalid entry date' using errcode='22023'; end;
  if to_char(d,'YYYY-MM-DD')<>dt then raise exception 'invalid calendar date' using errcode='22023'; end if;
  if e?'created' and e->'created'<>'null'::jsonb then
   if restore_fixture.checked_number(e->'created',true)<0 then raise exception 'invalid entry order' using errcode='22023'; end if;
  end if;
  seen:=seen||jsonb_build_object(eid,true);
 end loop;
 for e in select value from jsonb_array_elements(p->'entries') with ordinality as t(value,ord)
   order by value->>'date',case when value->'created' is null or value->'created'='null'::jsonb then 0 else restore_fixture.checked_number(value->'created',true) end,ord
 loop
  aid:=e->>'accountId'; kind:=e->>'type'; cur:=e->>'currency'; sym:=e->>'symbol'; delta:=0;
  if coalesce(kind,'') not in ('OPEN','BUY','SELL','DEPOSIT','WITHDRAW','DIVIDEND','FX')
     or coalesce(cur,'') not in ('USD','KRW') then raise exception 'invalid transaction type or currency' using errcode='22023'; end if;
  if kind in ('OPEN','BUY','SELL') then
   qty:=restore_fixture.checked_number(e->'qty',true); price:=restore_fixture.checked_number(e->'price',true);
   if cur<>'USD' or coalesce(sym,'') !~ '^[A-Z][A-Z0-9.-]{0,15}$' or qty<=0 or price<0
      or qty*price>1000000000000000 then raise exception 'invalid stock transaction' using errcode='22023'; end if;
   k:=jsonb_build_array(aid,sym)::text;
   next_value:=coalesce((positions->>k)::numeric,0)+case when kind='SELL' then -qty else qty end;
   if next_value< -0.0000001 or abs(next_value)>1000000000000000 then raise exception 'position balance exceeded' using errcode='22023'; end if;
   positions:=positions||jsonb_build_object(k,next_value);
   delta:=case when kind='BUY' then -qty*price when kind='SELL' then qty*price else 0 end;
  else
   amt:=restore_fixture.checked_number(e->'amount',true);
   if amt<=0 then raise exception 'invalid cash amount' using errcode='22023'; end if;
   delta:=case when kind in ('WITHDRAW','FX') then -amt else amt end;
   if kind='FX' then
    received:=restore_fixture.checked_number(e->'toAmount',true);
    if coalesce(e->>'toCurrency','') not in ('USD','KRW') or e->>'toCurrency'=cur or received<=0 then
     raise exception 'invalid FX transaction' using errcode='22023'; end if;
   end if;
  end if;
  k:=jsonb_build_array(aid,cur)::text;
  next_value:=coalesce((cash->>k)::numeric,0)+delta;
  if next_value< -0.0000001 or abs(next_value)>1000000000000000 then raise exception 'cash balance exceeded' using errcode='22023'; end if;
  cash:=cash||jsonb_build_object(k,next_value);
  if kind='FX' then
   k:=jsonb_build_array(aid,e->>'toCurrency')::text;
   next_value:=coalesce((cash->>k)::numeric,0)+received;
   if abs(next_value)>1000000000000000 then raise exception 'cash balance exceeded' using errcode='22023'; end if;
   cash:=cash||jsonb_build_object(k,next_value);
  end if;
 end loop;
end;
$fn$;

create function restore_fixture.validate_strategy_domain(p jsonb)
returns void language plpgsql immutable security invoker set search_path=''
as $fn$
declare g record; item jsonb; t jsonb; kv record; names jsonb; n text;
begin
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'invalid strategy map' using errcode='22023'; end if;
 for g in select key,value from jsonb_each(p) loop
  if char_length(btrim(g.key)) not between 1 and 80 or g.key in ('__proto__','constructor','prototype')
     or jsonb_typeof(g.value) is distinct from 'array' then raise exception 'invalid group' using errcode='22023'; end if;
  if jsonb_array_length(g.value) not between 1 and 30 then raise exception 'invalid group size' using errcode='22023'; end if;
  names:='{}';
  for item in select value from jsonb_array_elements(g.value) loop
   n:=item->>'name';
   if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'name') is distinct from 'string'
      or coalesce(char_length(btrim(n)),0) not between 1 and 80 or char_length(n)>80
      or n in ('__proto__','constructor','prototype') or names?n
      or jsonb_typeof(item->'trades') is distinct from 'array' then raise exception 'invalid strategy item' using errcode='22023'; end if;
   names:=names||jsonb_build_object(n,true);
   if jsonb_array_length(item->'trades')>100 then raise exception 'trade quota' using errcode='22023'; end if;
   if item?'targetCash' and restore_fixture.checked_number(item->'targetCash')<0 then raise exception 'invalid target cash' using errcode='22023'; end if;
   if item?'terminalPrices' then
    if jsonb_typeof(item->'terminalPrices') is distinct from 'object' then raise exception 'invalid prices' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(item->'terminalPrices'))>300 then raise exception 'price quota' using errcode='22023'; end if;
    for kv in select key,value from jsonb_each(item->'terminalPrices') loop
     if kv.key !~ '^[A-Z0-9.^_-]{1,20}$' or restore_fixture.checked_number(kv.value)<0 then raise exception 'invalid terminal price' using errcode='22023'; end if;
    end loop;
   end if;
   -- Forecast schema is not yet ported; reject nonempty forecasts rather than accept unvalidated data.
   if item?'forecastPrices' and item->'forecastPrices'<>'{}'::jsonb then raise exception 'forecast validation pending' using errcode='22023'; end if;
   for t in select value from jsonb_array_elements(item->'trades') loop
    if jsonb_typeof(t) is distinct from 'object' or coalesce(t->>'side','') not in ('buy','sell')
       or coalesce(t->>'ticker','') !~ '^[A-Z0-9.^_-]{1,20}$'
       or restore_fixture.checked_number(t->'quantity')<=0 or restore_fixture.checked_number(t->'price')<=0
       or (t?'fee' and t->'fee'<>'null'::jsonb and restore_fixture.checked_number(t->'fee')<0)
       or (t?'priceBasis' and coalesce(t->>'priceBasis','') not in ('manual','bear','bull')) then
     raise exception 'invalid strategy trade' using errcode='22023';
    end if;
   end loop;
  end loop;
 end loop;
end;
$fn$;
revoke all on function restore_fixture.checked_number(jsonb,boolean),restore_fixture.validate_ledger_domain(jsonb),restore_fixture.validate_strategy_domain(jsonb) from public,anon,authenticated;
grant execute on function restore_fixture.checked_number(jsonb,boolean),restore_fixture.validate_ledger_domain(jsonb),restore_fixture.validate_strategy_domain(jsonb) to authenticated;
