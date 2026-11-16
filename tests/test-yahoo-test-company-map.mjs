import test from "node:test";
import assert from "node:assert/strict";
import {readYahooTestCompanyMap} from "../src/market/read-yahoo-test-company-map.mjs";
const URL="https://gopofxyezhwpfxbecrxd.supabase.co";
const rows=["MSFT","GOOGL","AMZN","META","TSLA"].map((ticker,i)=>({id:i+11,ticker}));
function client({url=URL,user="test-user",data=rows,shortPage=false,countChanges=false}={}){
 let reads=0,counts=0;
 const obj={supabaseUrl:url,auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},
 from(table){assert.equal(table,"companies");reads++;return {select(fields,opts={}){
 if(opts.head){assert.equal(fields,"id");counts++;return Promise.resolve({count:data.length+(countChanges&&counts>1?1:0),error:null});}
 assert.equal(fields,"id,ticker");
 return {order(){return {range:async(start,end)=>({data:shortPage?[]:data.slice(start,end+1),error:null})}}};
 }};}};
 return {obj,getReads:()=>reads};
}
test("returns actual TEST company IDs using count and page reads only",async()=>{
 const {obj,getReads}=client();
 assert.deepEqual(await readYahooTestCompanyMap(obj),{MSFT:11,GOOGL:12,AMZN:13,META:14,TSLA:15});
 assert.equal(getReads(),3);
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
 const bad=rows.map(row=>({...row}));bad[1].id=bad[0].id;
 await assert.rejects(readYahooTestCompanyMap(client({data:bad}).obj),/duplicate/);
});
test("finds required symbols beyond first 1000 rows",async()=>{
 const many=Array.from({length:1000},(_,i)=>({id:i+100,ticker:"OTHER"+i}));
 many.push(...rows.map((row,i)=>({...row,id:i+2000})));
 const map=await readYahooTestCompanyMap(client({data:many}).obj);
 assert.equal(map.TSLA,2004);
});
test("blocks truncated company pages",async()=>{
 await assert.rejects(readYahooTestCompanyMap(client({shortPage:true}).obj),/Incomplete/);
});
test("blocks count changes while reading",async()=>{
 await assert.rejects(readYahooTestCompanyMap(client({countChanges:true}).obj),/count changed/);
});
