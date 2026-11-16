import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readMyLedgerAll} from '../src/sync/online-ledger-export.mjs';
const user='11111111-1111-4111-8111-111111111111';
function mock(total=2,wrongOwner=false){let calls=0;return {get calls(){return calls},auth:{getUser:async()=>({data:{user:{id:user}},error:null})},from(){return {select(){return {eq(){return {range(start,end){calls++;return Promise.resolve({data:Array.from({length:Math.max(0,Math.min(end+1,total)-start)},(_,i)=>({user_id:wrongOwner?'other':user,id:start+i})),count:total,error:null})}}}}}}}};}
test('authenticated online export reads owner records without writes',async()=>{
 const c=mock(2),result=await readMyLedgerAll(c,{verifiedUserId:user,sessionUserId:user});
 assert.equal(result.rows.length,2);assert.equal(result.total,2);assert.equal(result.canPost,false);assert.equal(c.calls,1);
});
test('oversized ledger and cross-owner rows fail closed',async()=>{
 await assert.rejects(()=>readMyLedgerAll(mock(1001),{verifiedUserId:user,sessionUserId:user}),/초과/);
 await assert.rejects(()=>readMyLedgerAll(mock(1,true),{verifiedUserId:user,sessionUserId:user}),/다른 사용자/);
});
test('online backup UI remains disabled until login',()=>{
 const html=readFileSync(new URL('../shared-data.html',import.meta.url),'utf8');
 assert.match(html,/id="onlineLedgerExport"[^>]*disabled/);assert.match(html,/readMyLedgerAll\(source/);
 assert.match(html,/"onlineLedgerExport"\)\.disabled = !verifiedUserId/);
});
