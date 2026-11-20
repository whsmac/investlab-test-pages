// Browser-based TEST Pilot smoke check. The entire whsmac.github.io origin
// is intercepted and served from a local validated bundle. All other network
// requests are blocked; no remote Supabase authentication or DB operations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const ROOT='https://whsmac.github.io/investlab-test-pages/';
const BASE=new URL(ROOT);
const SITE=path.resolve(process.env.INVESTLAB_TEST_SITE||'');
if(!process.env.INVESTLAB_TEST_SITE)throw Error('Set INVESTLAB_TEST_SITE to an offline assembled TEST website');
const CONTENT_TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
 '.jpg':'image/jpeg','.woff2':'font/woff2'};
const MENUS=[
 ['My Portfolio','my-portfolio.html'],
 ['Virtual Trade Simulator','virtual-trade-simulator.html'],
 ['Company Investment Analysis','company-investment-analysis.html'],
 ['Unified Ledger','pilot-ledger.html'],
 ['Data Management','data-management.html'],
];
async function localRoute(route){
 const url=new URL(route.request().url());
 if(url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname)){
  await route.abort('blockedbyclient');return;
 }
 let relative=decodeURIComponent(url.pathname.slice(BASE.pathname.length));
 if(!relative||relative.endsWith('/'))relative+='index.html';
 const dest=path.resolve(SITE,relative);
 if(dest!==SITE&&!dest.startsWith(SITE+path.sep)){
  await route.fulfill({status:403,body:'forbidden'});return;
 }
 try{
  if(!(await stat(dest)).isFile())throw Error('Not a file');
  await route.fulfill({status:200,body:await readFile(dest),
   contentType:CONTENT_TYPES[path.extname(dest)]||'application/octet-stream'});
 }catch{
  await route.fulfill({status:404,body:'not found',contentType:'text/plain'});
 }
}
const setup=async(browser,viewport)=>{
 const context=await browser.newContext({viewport,serviceWorkers:'block'});
 await context.route('**/*',localRoute);
 const page=await context.newPage();
 return {context,page};
};
const waitForQuotes=page=>page.waitForFunction(()=>{
 const status=document.querySelector('#status')?.textContent||'';
 return status.includes('6/6개 기업')&&document.querySelector('#lastDate')?.textContent!=='—';
},{timeout:15000});

test('Offline Pilot browser navigation and 3y/5y charts work on desktop and mobile',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1280,height:850},{width:390,height:844}]){
   const {context,page}=await setup(browser,viewport);
   const device=viewport.width<500?'mobile':'desktop';
   try{
    await page.goto(ROOT,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('a.card').count(),5,device+': 5 home menus');
    for(const [label,target] of MENUS){
     await page.goto(ROOT,{waitUntil:'domcontentloaded'});
     const link=page.locator('a.card[href="./'+target+'"]');
     assert.equal(await link.count(),1,device+': '+label+' has one home link');
     await link.click();
     await page.waitForURL(ROOT+target,{timeout:10000});
     assert.ok((await page.locator('body').innerText()).length>20,device+': '+label+' visible');
     console.log('PASS',device,'menu',label);
    }

    await page.goto(ROOT+'company-investment-analysis.html',{waitUntil:'domcontentloaded'});
    await page.locator('#period').selectOption('5y');
    await waitForQuotes(page);
    assert.match(await page.locator('#historyCoverageStatus').innerText(),/2021-11-20/);
    assert.match(await page.locator('#priceChart').innerText(),/2021-11-20/);
    assert.match(await page.locator('#lastDate').innerText(),/2026-11-19/);
    const tslaOnly=await page.locator('#priceChart path').count();
    assert.ok(tslaOnly>=1,device+': TSLA 5y SVG path');
    console.log('PASS',device,'five-year chart',tslaOnly);

    await page.locator('#tickerButtons button[aria-label^="SPCX"]').click();
    assert.match(await page.locator('#priceChartNote').innerText(),/SPCX.*각자 첫 거래일/);
    assert.match(await page.locator('#historyCoverageStatus').innerText(),/SPCX 2026-06-12부터/);
    assert.match(await page.locator('#priceChart').innerText(),/2021-11-20/);
    console.log('PASS',device,'TSLA five-year history retained with SPCX selected');

    await page.locator('#period').selectOption('3y');
    await waitForQuotes(page);
    assert.match(await page.locator('#historyCoverageStatus').innerText(),/2023-11-20/);
    assert.match(await page.locator('#priceChart').innerText(),/2023-11-20/);
    assert.equal(await page.locator('#financialTicker').inputValue(),'SPCX');
    console.log('PASS',device,'three-year period and selected financial ticker');
    if(device==='mobile'){
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+4);
     assert.equal(overflow,false,'mobile horizontal overflow is confined to chart/table scroll containers');
    }
   }finally{await context.close();}
  }
 }finally{await browser.close();}
});
