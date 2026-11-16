import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readMyLedgerPage} from '../src/sync/online-ledger-page.mjs';
const user='11111111-1111-4111-8111-111111111111';
function client(rows=[{id:'a',user_id:user}],count=rows.length){const calls=[];return {calls,auth:{getUser:async()=>({data:{user:{id:user}},error:null})},from(name){calls.push(['from',name]);return {select(columns,options){calls.push(['select',columns,options.count]);return {eq(key,value){calls.push(['eq',key,value]);return {range(start,end){calls.push(['range',start,end]);return Promise.resolve({data:rows,count,error:null})}}}}}}}};}
test('reads actual rows for authenticated owner and paginates without writes',async()=>{
 const c=client();const result=await readMyLedgerPage(c,{verifiedUserId:user,sessionUserId:user,page:1,pageSize:20});
 assert.equal(result.rows[0].id,'a');assert.equal(result.canPost,false);
 assert.deepEqual(c.calls,[['from','ledger_transactions'],['select','*','exact'],['eq','user_id',user],['range',20,39]]);
});
test('fails closed for other user and invalid pagination',async()=>{
 await assert.rejects(()=>readMyLedgerPage(client([{user_id:'other'}]),{verifiedUserId:user,sessionUserId:user}),/다른 사용자/);
 await assert.rejects(()=>readMyLedgerPage(client(),{verifiedUserId:user,sessionUserId:'other'}),/불일치/);
 await assert.rejects(()=>readMyLedgerPage(client(),{verifiedUserId:user,sessionUserId:user,page:-1}),/범위/);
});
test('online table uses textContent and clears data on auth invalidation',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="onlineLedgerRows"/);assert.match(html,/readMyLedgerPage\(source/);
 assert.match(html,/td.textContent=value/);assert.match(html,/if \(!verifiedUserId\) \{ \$\("onlineLedgerRows"\)\.replaceChildren\(\)/);
});
