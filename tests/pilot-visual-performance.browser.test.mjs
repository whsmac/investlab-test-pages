import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const ROOT='https://whsmac.github.io/investlab-test-pages/',SITE=path.resolve('.');
test('actual visual dashboard markup: synchronized dates, composition, watchlist separation, responsive layout',async()=>{
 const browser=await chromium.launch();
 try{
  const pageHtml=await readFile('investment-performance.html','utf8');
  const panel=pageHtml.slice(pageHtml.indexOf('<section class="panel visual-performance"'),pageHtml.indexOf('</div></main><script type="module"'));
  const script='import {renderPortfolioHistory} from "./src/ui/pilot-portfolio-history-ui.mjs";import {indexRows} from "./src/ledger/pilot-portfolio-history.mjs";const ledger={version:1,accounts:[{id:"a",name:"Synthetic"}],watchlist:["GOOGL","QLD"],entries:[{id:"1",accountId:"a",date:"2026-11-20",type:"OPEN",symbol:"TSLA",qty:2,price:100,currency:"USD"},{id:"2",accountId:"a",date:"2026-11-20",type:"DEPOSIT",amount:100,currency:"USD"},{id:"3",accountId:"a",date:"2026-11-23",type:"BUY",symbol:"TSLA",qty:1,price:100,currency:"USD"}]};const market=indexRows([{ticker:"TSLA",date:"2026-11-20",close:100},{ticker:"TSLA",date:"2026-11-23",close:120},{ticker:"GOOGL",date:"2026-11-20",close:90},{ticker:"GOOGL",date:"2026-11-23",close:99},{ticker:"NDX",date:"2026-11-20",close:10000},{ticker:"NDX",date:"2026-11-23",close:10200},{ticker:"SPX",date:"2026-11-20",close:5000},{ticker:"SPX",date:"2026-11-23",close:5100}]);document.querySelector("#historyPanel").hidden=false;renderPortfolioHistory(ledger,market,"2026-11-20","2026-11-23","ALL","USD");';
  for(const width of [1280,390]){
   const ctx=await browser.newContext({viewport:{width,height:850}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await ctx.route('**/*',async route=>{const u=new URL(route.request().url());if(u.href===ROOT+'visual-fixture.html'){await route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'+pageHtml.slice(pageHtml.indexOf('<style>'),pageHtml.indexOf('</head>'))+'<main class="wrap"><div id="portfolioPrivate">'+panel+'</div></main><script type="module">'+script+'</script>'});return;}if(!u.href.startsWith(ROOT)){await route.abort();return;}const dest=path.resolve(SITE,u.pathname.slice(new URL(ROOT).pathname.length));if(!dest.startsWith(SITE+path.sep)){await route.abort();return;}try{await route.fulfill({body:await readFile(dest),contentType:dest.endsWith('.mjs')?'text/javascript':dest.endsWith('.css')?'text/css':'text/plain'});}catch{await route.fulfill({status:404,body:'not found'});}});
   await page.goto(ROOT+'visual-fixture.html');await page.locator('#visualDay').getByText('2026-11-23').waitFor();
   assert.match(await page.locator('#visualHero').innerText(),/USD 360/);
   assert.match(await page.locator('#visualHero').innerText(),/투자손익 \(입출금 제외\)/);
   assert.match(await page.locator('#visualHero').innerText(),/S&P 500 대비/);
   assert.match(await page.locator('#visualPeriodSummary').innerText(),/성과 계산 기준일 2026-11-20/);
   assert.equal(await page.locator('#historyPresets button[data-period=ytd]').count(),1);
   assert.equal(await page.locator('#visualHoldingDetails').getAttribute('open'),null);
   assert.match(await page.locator('#visualTreemap g[data-ticker=TSLA]').textContent(),/3주/);
   await page.locator('#visualTreemap g[data-ticker=TSLA]').click();
   assert.match(await page.locator('#visualTreemapDetail').innerText(),/TSLA.*3주.*USD 360/);
   await page.locator('#visualHoldingDetails summary').click();
   assert.match(await page.locator('#visualSelection').innerText(),/3주/);
   await page.locator('#visualHoldingDetails summary').click();
   assert.equal(await page.locator('#visualTreemap g[aria-label*="GOOGL"]').count(),0);
   assert.equal(await page.locator('#visualMarketHeat,#assetWeightMode,#historyWeights').count(),0);
   assert.match(await page.locator('#assetDateDetail').innerText(),/USD 360/);
   assert.match(await page.locator('#comparisonDateDetail').innerText(),/NASDAQ 100/);
   await page.locator('#visualComparePicks input[value=ndx]').uncheck();
   assert.doesNotMatch(await page.locator('#comparisonDateDetail').innerText(),/NASDAQ 100/);
   await page.locator('#visualComparePicks input[value=ndx]').check();
   await page.locator('#visualSlider').fill('0');
   assert.equal(await page.locator('#visualDay').innerText(),'2026-11-20');
   assert.match(await page.locator('#visualTreemap g[data-ticker=TSLA]').textContent(),/2주/);
   await page.locator('#visualComparePicks input[value=GOOGL]').check();
   assert.match(await page.locator('#historyPerformance .visual-legend').innerText(),/GOOGL/);
   assert.match(await page.locator('#comparisonDateDetail').innerText(),/GOOGL/);
   await page.locator('#visualGranularity').selectOption('month');
   assert.equal(await page.locator('#historyAssets svg').count(),1);
   await page.locator('#visualNext').click();assert.equal(await page.locator('#visualDay').innerText(),'2026-11-21');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),true);
   assert.deepEqual(errors,[]);await ctx.close();
  }
 }finally{await browser.close();}
});

test('standalone performance page requires a verified TEST owner and hides private data on logout',async()=>{
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:850}});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const clientStub='window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:window.__owner||null},error:null})},from:()=>{window.__reads=(window.__reads||0)+1;return {select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};}})};';
  await ctx.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname==='cdn.jsdelivr.net'){await route.fulfill({contentType:'text/javascript',body:clientStub});return;}
   if(!u.href.startsWith(ROOT)){await route.abort();return;}
   const dest=path.resolve(SITE,u.pathname.slice(new URL(ROOT).pathname.length));if(!dest.startsWith(SITE+path.sep)){await route.abort();return;}
   try{await route.fulfill({body:await readFile(dest),contentType:dest.endsWith('.html')?'text/html':dest.endsWith('.mjs')?'text/javascript':dest.endsWith('.css')?'text/css':'application/json'});}catch{await route.fulfill({status:404,body:'not found'});}
  });
  await page.goto(ROOT+'investment-performance.html');
  await page.locator('#portfolioAccessStatus').getByText(/TEST 홈에서 같은 계정/).waitFor();
  assert.equal(await page.locator('#portfolioPrivate').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.__reads||0),0);
  await page.evaluate(()=>{localStorage.setItem('investlab_shared_data_connection_v1',JSON.stringify({url:'https://gopofxyezhwpfxbecrxd.supabase.co',key:'sb_publishable_fixture'}));});
  await page.locator('#portfolioRetry').click();
  await page.locator('#portfolioAccessStatus').getByText(/TEST 홈에서 로그인/).waitFor();
  assert.equal(await page.evaluate(()=>window.__reads||0),0);
  await page.evaluate(()=>{window.__owner={id:'11111111-1111-4111-8111-111111111111'};});
  await page.locator('#portfolioRetry').click();
  await page.locator('#portfolioAccessStatus').getByText(/이 TEST 계정에 서버 원장/).waitFor();
  assert.equal(await page.locator('#portfolioPrivate').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.__reads),1);
  assert.deepEqual(errors,[]);await ctx.close();
 }finally{await browser.close();}
});
