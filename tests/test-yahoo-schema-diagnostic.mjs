import test from "node:test";
import assert from "node:assert/strict";
import {diagnoseYahooTestSchema} from "../src/market/diagnose-yahoo-test-schema.mjs";
const URL="https://gopofxyezhwpfxbecrxd.supabase.co";
function client({companies,prices,companyError=null,priceError=null}={}){
 const calls=[];
 return {supabaseUrl:URL,calls,auth:{getUser:async()=>({data:{user:{id:"test"}}})},
 from(table){calls.push(table);return {select(columns){calls.push(columns);return {limit:async()=>table==="companies"
 ?{data:companies??[],error:companyError}:{data:prices??[],error:priceError}}}}}};
}
test("compatible TEST schema is read-only",async()=>{
 const c=client({companies:["MSFT","GOOGL","AMZN","META","TSLA"].map((ticker,i)=>({id:i+1,ticker})),prices:[{id:1}]});
 const r=await diagnoseYahooTestSchema(c);
 assert.equal(r.compatible,true);assert.equal(r.database_writes,0);
 assert.deepEqual(c.calls.filter(x=>x==="companies"||x==="market_price_observations"),["companies","market_price_observations"]);
});
test("missing ticker blocks compatibility",async()=>{
 const r=await diagnoseYahooTestSchema(client({companies:[{id:1,ticker:"MSFT"}]}));
 assert.equal(r.compatible,false);assert.equal(r.checks[0].missing_tickers.length,4);
});
test("schema query error is reported, not silently passed",async()=>{
 const r=await diagnoseYahooTestSchema(client({companyError:{message:"column ticker does not exist"}}));
 assert.equal(r.compatible,false);assert.match(r.checks[0].reason,/ticker/);
});
test("non-TEST URL is rejected",async()=>{
 await assert.rejects(()=>diagnoseYahooTestSchema({...client(),supabaseUrl:"https://other.supabase.co"}),/mismatch/);
});
