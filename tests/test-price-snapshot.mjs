import test from "node:test";
import assert from "node:assert/strict";
import { readTestPriceSnapshot } from "../src/market/read-test-price-snapshot.mjs";

function client(rows, { countOverride, truncate = false, companies = [{id:1,ticker:"MSFT"}] } = {}) {
  return {
    supabaseUrl: "https://gopofxyezhwpfxbecrxd.supabase.co",
    auth: { async getUser() { return { data: { user: { id: "test-user" } }, error: null }; } },
    from(table) {
      if (table === "companies") return {
        select(_fields,options={}) {
          if(options.head) return Promise.resolve({count:companies.length,error:null});
          return {order(){return {async range(start,end){return {data:companies.slice(start,end+1),error:null}}}}};
        }
      };
      if (table !== "market_price_observations") throw Error("Unexpected table");
      return {
        select(_columns, options = {}) {
          if (options.head) return Promise.resolve({ count: countOverride ?? rows.length, error: null });
          return { order() { return { async range(start, end) {
            return { data: truncate ? [] : rows.slice(start, end + 1), error: null };
          } }; } };
        }
      };
    }
  };
}
const sample = [
  { id: 1, company_id: 1, trading_date: "2026-11-12", close_price: 100, currency: "USD", price_basis: "close" },
  { id: 2, company_id: 1, trading_date: "2026-11-13", close_price: 110, currency: "USD", price_basis: "close" }
];
test("reads all authenticated visible rows", async () => {
  const result = await readTestPriceSnapshot(client(sample), { pageSize: 1 });
  assert.equal(result.coverage.rows, 2);
  assert.equal(result.coverage.scope, "authenticated_RLS_visible_rows_only");
  assert.equal(result.observations[1].ticker, "MSFT");
});
test("rejects snapshot exceeding cap", async () => {
  await assert.rejects(readTestPriceSnapshot(client(sample), { maxRows: 1 }), /exceed maxRows/);
});
test("rejects truncated page", async () => {
  await assert.rejects(readTestPriceSnapshot(client(sample, { truncate: true })), /changed during paging/);
});
test("rejects duplicate observation id", async () => {
  await assert.rejects(readTestPriceSnapshot(client([{ ...sample[0] }, { ...sample[0] }])), /Duplicate/);
});
test("maps companies beyond first thousand RLS-visible rows", async () => {
  const companies=Array.from({length:1000},(_,i)=>({id:i+10,ticker:"OTHER"+i}));
  companies.push({id:1,ticker:"MSFT"});
  const result=await readTestPriceSnapshot(client(sample,{companies}));
  assert.equal(result.observations[0].ticker,"MSFT");
});
test("rejects truncated company list", async () => {
  const companies=[{id:1,ticker:"MSFT"}];
  const broken=client(sample,{companies});
  const original=broken.from;
  broken.from=(table)=>{
    const query=original(table);
    if(table!=="companies")return query;
    return {select(fields,opts){
      if(opts?.head)return query.select(fields,opts);
      return {order(){return {async range(){return {data:[],error:null}}}}};
    }};
  };
  await assert.rejects(readTestPriceSnapshot(broken),/Company snapshot truncated/);
});
test("rejects invalid TEST project", async () => {
  const bad = client(sample); bad.supabaseUrl = "https://example.supabase.co";
  await assert.rejects(readTestPriceSnapshot(bad), /TEST Supabase URL mismatch/);
});
