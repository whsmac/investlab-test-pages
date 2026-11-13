-- INVESTLAB TEST PostgreSQL parity probe — REVIEW ONLY / DO NOT EXECUTE
-- Read-only DO block. Requires pgcrypto installed in extensions schema.
-- Does not create functions, tables, accounts or events. Run only after separate TEST approval.
do $$
declare
 v_account uuid := '33333333-3333-4333-8333-333333333333';
 v_request text := 'open-1';
 v_rows jsonb;
 v_canonical text;
 v_hash text;
 v_expected text;
 v_case text;
begin
 for v_case,v_rows,v_expected in
  select * from (values
   ('cash', '[{"assetType":"cash","assetCode":"USD","delta":"500.00000000"}]'::jsonb,
    'f0569a9df45b150dda65d0eb185bfd3322b47e470303d6426aa770f9ea3c335d'::text),
   ('mixed', '[{"assetType":"security","assetCode":"TSLA","delta":"2.00000000","openingCostBasisUsd":"100.00000000"},{"assetType":"cash","assetCode":"KRW","delta":"1200.00000000"}]'::jsonb,
    '13ad14800a8249d377a88cff6726e8fb8abaa77a6eb0a6828f12aee0550cf4ef'::text)
  ) as fixture(name,rows,expected)
 loop
  select '{"version":1,"eventType":"opening","accountId":'||to_json(v_account::text)::text||
   ',"requestId":'||to_json(v_request)::text||',"rows":['||
   string_agg(
    '{"assetType":'||to_json(x->>'assetType')::text||',"assetCode":'||to_json(x->>'assetCode')::text||
    ',"delta":'||to_json(x->>'delta')::text||
    case when x->>'assetType'='security' then ',"openingCostBasisUsd":'||to_json(x->>'openingCostBasisUsd')::text else '' end||'}',
    ',' order by ((x->>'assetType')||':'||(x->>'assetCode')) collate "C"
   )||']}' into v_canonical from jsonb_array_elements(v_rows) x;
  v_hash := encode(extensions.digest(convert_to(v_canonical,'UTF8'),'sha256'),'hex');
  if v_hash is distinct from v_expected then
   raise exception 'opening SHA-256 parity mismatch for %, got %, expected %',v_case,v_hash,v_expected;
  end if;
  raise notice 'PASS opening SHA-256 parity: %',v_case;
 end loop;
end;
$$;
-- STOP. SQL not executed. Real TEST PostgreSQL verification remains outstanding.
