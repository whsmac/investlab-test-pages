import test from "node:test";
import assert from "node:assert/strict";
import {diagnoseYahooTestSchema} from "../src/market/diagnose-yahoo-test-schema.mjs";
const URL="https://gopofxyezhwpfxbecrxd.supabase.co";
function client({companies=[],prices=[],companyError=null,priceError=null,shortPage=false,countChanges=false}={}){
 const calls=[];let countReads=0;
 return {supabaseUrl:URL,calls,auth:{getUser:async()=>({data:{user:{id:"test"}}})},
 from(table){
   calls.push(table);
   return {select(columns,opts={}){
     calls.push(columns);
     if(table==="companies"&&opts.head) {countReads++;return Promise.resolve({count:companies.length+(countChanges&&countReads>1?1:0),error:null});}
     if(table==="companies") return {order(){return {range:async(start,end)=>({
       data:shortPage?[]:companies.slice(start,end+1),error:companyError
     })}}};
     return {limit:async()=>({data:prices,error:priceError})};
   }};
 }};
}
const five=["MSFT","GOOGL","AMZN","META","TSLA"].map((ticker,i)=>({id:i+1,ticker}));
test("compatible TEST schema uses exact count and paginated read-only selects",async()=>{
 const c=client({companies:five,prices:[{id:1}]});
 const r=await diagnoseYahooTestSchema(c);
 assert.equal(r.compatible,true);assert.equal(r.database_writes,0);
 assert.equal(r.checks[0].visible_rows_checked,5);
 assert.equal(c.calls.filter(x=>x==="companies").length,2);
});
test("missing ticker blocks compatibility",async()=>{
 const r=await diagnoseYahooTestSchema(client({companies:[{id:1,ticker:"MSFT"}]}));
 assert.equal(r.compatible,false);assert.equal(r.checks[0].missing_tickers.length,4);
});
test("schema query error is reported",async()=>{
 const r=await diagnoseYahooTestSchema(client({companies:five,companyError:{message:"column ticker does not exist"}}));
 assert.equal(r.compatible,false);assert.match(r.checks[0].reason,/ticker/);
});
test("partial company page is blocked",async()=>{
 const r=await diagnoseYahooTestSchema(client({companies:five,shortPage:true}));
 assert.equal(r.compatible,false);assert.match(r.checks[0].reason,/pagination incomplete/);
});
test("required ticker beyond first 1000 rows is found",async()=>{
 const rows=Array.from({length:1000},(_,i)=>({id:i+10,ticker:"OTHER"+i}));
 rows.push(...five.map((r,i)=>({...r,id:2000+i})));
 const r=await diagnoseYahooTestSchema(client({companies:rows}));
 assert.equal(r.compatible,true);assert.equal(r.checks[0].visible_rows_checked,1005);
});
test("duplicate ticker is blocked",async()=>{
 const r=await diagnoseYahooTestSchema(client({companies:[...five,{id:10,ticker:"TSLA"}]}));
 assert.equal(r.compatible,false);assert.equal(r.checks[0].duplicate_tickers,1);
});
test("non-TEST URL is rejected",async()=>{
 await assert.rejects(()=>diagnoseYahooTestSchema({...client(),supabaseUrl:"https://other.supabase.co"}),/mismatch/);
});

test("changing RLS-visible company count blocks compatibility",async()=>{
 const r=await diagnoseYahooTestSchema(client({companies:five,prices:[{id:1}],countChanges:true}));
 assert.equal(r.compatible,false);assert.match(r.checks[0].reason,/count changed/);
});
test("zero RLS-visible price observations cannot be called compatible",async()=>{
 const r=await diagnoseYahooTestSchema(client({companies:five,prices:[]}));
 assert.equal(r.compatible,false);assert.match(r.checks[1].reason,/No RLS-visible/);
});
