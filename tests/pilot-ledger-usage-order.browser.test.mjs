import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const ROOT='https://whsmac.github.io/investlab-test-pages/';
const SITE=path.resolve('.');
const OWNER='11111111-1111-4111-8111-111111111111';
const TARGET='https://gopofxyezhwpfxbecrxd.supabase.co';
const initial={version:1,accounts:[{id:'a',name:'Synthetic A',type:'일반'},{id:'b',name:'Synthetic B',type:'ISA'}],entries:[{id:'cash',accountId:'a',date:'2026-11-23',created:1,type:'DEPOSIT',currency:'USD',amount:1000}],watchlist:['TSLA']};
function installMock(fixture){
 window.__fixture=fixture;
 let rev='2026-11-24T00:00:00Z';
 window.supabase={createClient:()=>({
  auth:{getUser:async()=>({data:{user:{id:fixture.owner}}})},
  from(table){
   if(table!=='investlab_pilot_ledger_documents')throw Error('unexpected table');
   return {
    select:()=>({eq:(k,v)=>({maybeSingle:async()=>{if(k!=='user_id'||v!==fixture.owner)throw Error('owner mismatch');return {data:{payload:structuredClone(fixture.payload),updated_at:rev}};}})}),
    update:row=>({eq:(k,v)=>{
     if(k!=='user_id'||v!==fixture.owner)throw Error('owner mismatch');
     return {eq:(k2,v2)=>({select:async()=>{
      if(k2!=='updated_at'||v2!==rev)return {data:[]};
      fixture.payload=structuredClone(row.payload);rev=row.updated_at;return {data:[{updated_at:rev}]};
     }})};
    }})
   };
  }
 })};
}
async function setup(browser,viewport,payload){
 const context=await browser.newContext({viewport,serviceWorkers:'block'});
 await context.addInitScript(url=>{
  localStorage.setItem('investlab_shared_data_connection_v1',JSON.stringify({url,key:'sb_publishable_synthetic_test_only'}));
 },TARGET);
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.startsWith('/npm/@supabase/supabase-js')){
   await route.fulfill({contentType:'application/javascript',body:'('+installMock.toString()+')('+JSON.stringify({owner:OWNER,payload})+');'});return;
  }
  if(!u.href.startsWith(ROOT)){await route.abort('blockedbyclient');return;}
  const relative=decodeURIComponent(u.pathname.slice(new URL(ROOT).pathname.length)),dest=path.resolve(SITE,relative);
  if(!dest.startsWith(SITE+path.sep)){await route.abort();return;}
  try{await route.fulfill({status:200,body:await readFile(dest),contentType:({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(dest)]||'application/octet-stream'});}
  catch{await route.fulfill({status:404,body:'not found'});}
 });
 const page=await context.newPage();
 page.on('dialog',d=>d.accept());
 await page.goto(ROOT+'pilot-ledger.html');
 await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('자동 불러오기 완료'),null,{timeout:15000});
 return {context,page};
}
test('desktop and mobile: usage order, collapsed management, existing data and mock save/edit/delete',async()=>{
 const browser=await chromium.launch();
 try{
  for(const viewport of [{width:1280,height:850},{width:390,height:844}]){
   const {context,page}=await setup(browser,viewport,initial);
   try{
    assert.deepEqual(await page.locator('#ledgerPrivate > .panel').evaluateAll(els=>els.map(el=>el.id)),['entryPanel','historyPanel','accountManagement','watchManagement']);
    assert.equal(await page.locator('#accountManagement').getAttribute('open'),null);
    assert.equal(await page.locator('#watchManagement').getAttribute('open'),null);
    assert.equal(await page.locator('#accountForm').isVisible(),false);
    assert.equal(await page.locator('#entryForm').isVisible(),true);
    assert.equal(await page.locator('#transactions tr').count(),1);
    assert.equal(await page.locator('#entryAccount option').count(),2);
    await page.locator('#entryDate').fill('2026-11-24');
    await page.locator('#entryType').selectOption('BUY');
    await page.locator('#entrySymbol').fill('TSLA');
    await page.locator('#entryQty').fill('2');
    await page.locator('#entryPrice').fill('100');
    await page.locator('#entryFee').fill('2');
    assert.match(await page.locator('#entrySettlement').innerText(),/202/);
    await page.locator('#submitEntry').click();
    assert.equal(await page.locator('#transactions tr').count(),2);
    assert.match(await page.locator('#transactions tr').first().innerText(),/TSLA/);
    await page.waitForFunction(()=>window.__fixture.payload.entries.some(e=>e.type==='BUY'&&e.price===100&&e.feeUsd===2));
    assert.match(await page.locator('#transactions tr').first().innerText(),/202/);
    await page.locator('#transactions tr').first().getByRole('button',{name:'수정'}).click();
    assert.equal(await page.locator('#entryFee').inputValue(),'2');
    await page.locator('#entryQty').fill('3');
    assert.match(await page.locator('#entrySettlement').innerText(),/302/);
    await page.locator('#submitEntry').click();
    await page.waitForFunction(()=>window.__fixture.payload.entries.some(e=>e.type==='BUY'&&e.qty===3));
    await page.locator('#transactions tr').first().getByRole('button',{name:'삭제'}).click();
    await page.waitForFunction(()=>window.__fixture.payload.entries.length===1);
    await page.locator('#accountManagement summary').click();
    await page.locator('#accountName').fill('Synthetic C');
    await page.locator('#accountForm button[type=submit]').click();
    assert.match(await page.locator('#accountMessage').innerText(),/추가했습니다/);
    assert.equal(await page.locator('#entryAccount option').count(),3);
    await page.locator('#watchManagement summary').click();
    await page.locator('#watchSymbol').fill('TQQQ');
    await page.locator('#watchAdd').click();
    assert.match(await page.locator('#watchMessage').innerText(),/TQQQ/);
    await page.locator('#entrySymbolCategory').selectOption('watch');
    assert.equal(await page.locator('#entrySymbolPick option[value=TQQQ]').count(),1);
    await page.waitForFunction(()=>window.__fixture.payload.accounts.length===3&&window.__fixture.payload.watchlist.includes('TQQQ'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4),false);
    console.log('PASS',viewport.width,'order, details, transaction and management mock actions');
   }finally{await context.close();}
  }
  const {context,page}=await setup(browser,{width:390,height:844},{version:1,accounts:[],entries:[]});
  try{
   assert.equal(await page.locator('#noAccountHint').isVisible(),true);
   await page.locator('#openAccountManagement').click();
   assert.equal(await page.locator('#accountManagement').evaluate(el=>el.open),true);
   await page.locator('#accountName').fill('First account');
   await page.locator('#accountForm button[type=submit]').click();
   assert.equal(await page.locator('#noAccountHint').isVisible(),false);
   assert.equal(await page.locator('#entryAccount option').count(),1);
  }finally{await context.close();}
 }finally{await browser.close();}
});
