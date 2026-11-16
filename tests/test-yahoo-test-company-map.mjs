import test from "node:test";
import assert from "node:assert/strict";
import { readYahooTestCompanyMap } from "../src/market/read-yahoo-test-company-map.mjs";

const URL = "https://gopofxyezhwpfxbecrxd.supabase.co";
const rows = ["MSFT", "GOOGL", "AMZN", "META", "TSLA"].map((ticker, i) => ({id:i+11,ticker}));
function client({url=URL, user="test-user", data=rows}={}) {
  let reads=0;
  const obj={supabaseUrl:url, auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},
    from(table){assert.equal(table,"companies");reads++;return {
      select(fields){assert.equal(fields,"id,ticker");return {order:async()=>({data,error:null})};}
    };}};
  return {obj, getReads:()=>reads};
}

test("returns actual TEST company IDs, no writes",async()=>{
  const {obj,getReads}=client();
  assert.deepEqual(await readYahooTestCompanyMap(obj),
    {MSFT:11,GOOGL:12,AMZN:13,META:14,TSLA:15});
  assert.equal(getReads(),1);
});

test("rejects non-TEST Supabase",async()=>{
  await assert.rejects(readYahooTestCompanyMap(client({url:"https://production.invalid"}).obj),/TEST Supabase/);
});

test("rejects unauthenticated access",async()=>{
  await assert.rejects(readYahooTestCompanyMap(client({user:null}).obj),/login/);
});

test("rejects missing ticker",async()=>{
  await assert.rejects(readYahooTestCompanyMap(client({data:rows.slice(1)}).obj),/Missing TEST company/);
});

test("rejects duplicate ID",async()=>{
  const bad=rows.map(row=>({...row}));
  bad[1].id=bad[0].id;
  await assert.rejects(readYahooTestCompanyMap(client({data:bad}).obj),/duplicate/);
});
