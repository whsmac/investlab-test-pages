import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readMyLedgerSummary} from '../src/sync/online-ledger-read.mjs';
const user='11111111-1111-4111-8111-111111111111';
function mock(rows=[{user_id:user,id:'a'}],count=rows.length){
 let filters=[];const query={eq(k,v){filters.push([k,v]);return this},limit(n){filters.push(['limit',n]);return Promise.resolve({data:rows,count,error:null})}};
 return {filters,auth:{getUser:async()=>({data:{user:{id:user}},error:null})},from(table){filters.push(['table',table]);return {select(fields,opts){filters.push(['select',fields,opts.count]);return query}}}};
}
test('verified user reads only owner-filtered TEST ledger',async()=>{
 const client=mock();const result=await readMyLedgerSummary(client,{verifiedUserId:user,sessionUserId:user});
 assert.equal(result.count,1);assert.equal(result.canPost,false);assert.equal(result.canSync,false);
 assert.deepEqual(client.filters,[['table','ledger_transactions'],['select','*','exact'],['user_id',user],['limit',20]]);
});
test('mismatched identity or returned owner fails closed',async()=>{
 await assert.rejects(()=>readMyLedgerSummary(mock(),{verifiedUserId:user,sessionUserId:'other'}),/불일치/);
 await assert.rejects(()=>readMyLedgerSummary(mock([{user_id:'other'}]),{verifiedUserId:user,sessionUserId:user}),/다른 계정/);
});
test('TEST online ledger UI requires verified identity and has no write call',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="onlineLedgerRead"[^>]*disabled/);assert.match(html,/readMyLedgerSummary\(requestedClient/);
 assert.match(html,/"onlineLedgerRead"\)\.disabled = !verifiedUserId/);
});
