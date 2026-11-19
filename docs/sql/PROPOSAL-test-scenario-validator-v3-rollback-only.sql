-- INVESTLAB TEST v3 REVIEW-ONLY; DO NOT EXECUTE against any database.
-- Corrects v2 unsafe eager casts and malformed JSON evaluation; no DB writes performed.
-- Pending: independent PostgreSQL execution tests, privilege review, atomic RPC, rollback.
begin;
create function public.test_scenario_payload_valid_v3(steps jsonb, assumptions jsonb)
returns boolean language plpgsql immutable set search_path = ''
as $fn$
declare s jsonb; k text; v jsonb;
begin
 if steps is null or jsonb_typeof(steps) is distinct from 'array' then return false; end if;
 if jsonb_array_length(steps)>100 then return false; end if;
 for s in select value from jsonb_array_elements(steps) loop
  if jsonb_typeof(s) is distinct from 'object' then return false; end if;
  if (s - 'type' - 'ticker' - 'quantity' - 'price' - 'fee') <> '{}'::jsonb then return false; end if;
  if s->>'type' not in ('BUY','SELL') or s->>'type' is null then return false; end if;
  if coalesce(s->>'ticker','') !~ '^[A-Z0-9.^_-]{1,20}$' then return false; end if;
  if jsonb_typeof(s->'quantity') is distinct from 'number' then return false; end if;
  if jsonb_typeof(s->'price') is distinct from 'number' then return false; end if;
  if (s->>'quantity')::numeric <= 0 or (s->>'price')::numeric <= 0 then return false; end if;
  if s ? 'fee' then
   if jsonb_typeof(s->'fee') is distinct from 'number' then return false; end if;
   if (s->>'fee')::numeric < 0 then return false; end if;
  end if;
 end loop;
 if assumptions is null or jsonb_typeof(assumptions) is distinct from 'object' then return false; end if;
 if (assumptions - 'targetCash' - 'terminalPrices') <> '{}'::jsonb then return false; end if;
 if assumptions ? 'targetCash' then
  if jsonb_typeof(assumptions->'targetCash') is distinct from 'number' then return false; end if;
  if (assumptions->>'targetCash')::numeric < 0 then return false; end if;
 end if;
 if assumptions ? 'terminalPrices' then
  if jsonb_typeof(assumptions->'terminalPrices') is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(assumptions->'terminalPrices'))>300 then return false; end if;
  for k,v in select key,value from jsonb_each(assumptions->'terminalPrices') loop
   if k !~ '^[A-Z0-9.^_-]{1,20}$' then return false; end if;
   if jsonb_typeof(v) is distinct from 'number' then return false; end if;
   if (v#>>'{}')::numeric < 0 then return false; end if;
  end loop;
 end if;
 return true;
exception when others then
 return false;
end;
$fn$;
revoke all on function public.test_scenario_payload_valid_v3(jsonb,jsonb) from public,anon,authenticated;
-- This draft intentionally creates no table or write RPC.
-- The earlier v2 CREATE TABLE must NOT be run: its validator is superseded.
rollback;
-- ROLLBACK here protects accidental execution of this isolated draft; it is not
-- a replacement for migration approval or full integration tests.
