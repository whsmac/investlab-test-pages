import test from "node:test";
import assert from "node:assert/strict";
import {buildSafeYahooSchemaReport} from "../src/market/export-yahoo-schema-report.mjs";
const base={mode:"TEST_YAHOO_SCHEMA_DIAGNOSTIC_ONLY",database_writes:0,compatible:true,
 checks:[{table:"companies",status:"OK",missing_tickers:[],visible_rows_checked:6,
 reason:"private token abc",email:"person@example.com",url:"https://secret"},
 {table:"market_price_observations",status:"OK",sample_rows_visible:1,access_token:"secret"}]};
test("safe report excludes arbitrary backend errors and private fields",()=>{
 const r=buildSafeYahooSchemaReport(base),json=JSON.stringify(r);
 assert.equal(r.compatible,true);
 for(const value of ["private token","person@example.com","https://secret","access_token"])assert.equal(json.includes(value),false);
 assert.equal(r.checks[0].visible_rows_checked,6);
});
test("blocked diagnostic stays blocked",()=>{
 const r=buildSafeYahooSchemaReport({...base,compatible:false});
 assert.equal(r.compatible,false);
});
test("wrong mode or write count rejected",()=>{
 assert.throws(()=>buildSafeYahooSchemaReport({...base,database_writes:1}),/Invalid/);
});
test("unexpected table rejected",()=>{
 assert.throws(()=>buildSafeYahooSchemaReport({...base,checks:[{table:"auth.users",status:"OK"}]}),/Unexpected/);
});

test("empty or incomplete diagnostic cannot claim compatibility",()=>{
 assert.throws(()=>buildSafeYahooSchemaReport({...base,checks:[]}),/Incomplete/);
 assert.throws(()=>buildSafeYahooSchemaReport({...base,checks:[base.checks[0]]}),/Incomplete/);
});
test("duplicate table checks are rejected",()=>{
 assert.throws(()=>buildSafeYahooSchemaReport({...base,checks:[...base.checks,base.checks[0]]}),/Duplicate/);
});
