import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {widgetSymbol,chartFrameUrl,isChartTicker} from '../src/ui/pilot-tradingview-chart.mjs';
test('qualified security symbols and no ambiguous currency mapping',()=>{
 for(const [t,s] of Object.entries({TSLA:'NASDAQ:TSLA',TQQQ:'NASDAQ:TQQQ',BITU:'AMEX:BITU',USD:'AMEX:USD',SPCX:'NASDAQ:SPCX'})){
  assert.equal(widgetSymbol(t),s);const url=new URL(chartFrameUrl(t)),settings=JSON.parse(decodeURIComponent(url.hash.slice(1)));
  assert.equal(url.origin,'https://www.tradingview-widget.com');assert.equal(url.pathname,'/embed-widget/advanced-chart/');assert.equal(settings.symbol,s);assert.equal(settings.theme,'dark');assert.doesNotMatch(JSON.stringify(settings),/localStorage|supabase|user_id|portfolio/);
 }
 assert.equal(widgetSymbol('UNKNOWN'),null);assert.throws(()=>chartFrameUrl('UNKNOWN'));
 assert.equal(isChartTicker('<script>'),false);
});
test('all five pages wire the common popup without replacing comparison selectors',async()=>{
 for(const [file,marker] of [
  ['src/ui/pilot-portfolio-dashboard.mjs','createTickerChartButton(h.symbol)'],
  ['src/ui/pilot-ledger-ui.mjs','createTickerChartButton(e.symbol)'],
  ['virtual-trade-simulator.html','openTradingViewChart(ticker,button)'],
  ['company-investment-analysis.html','chartLinks.append(createTickerChartButton(ticker))'],
  ['market-trends.html','heading.append(createTickerChartButton(ticker))']
 ])assert.ok((await readFile(file,'utf8')).includes(marker),file);
});
test('sandboxed widget lazy-loads, closes, restores focus and uses external fallback on desktop/mobile',async()=>{
 const browser=await chromium.launch();
 const base='https://whsmac.github.io/investlab-test-pages/';
 const source=await readFile('src/ui/pilot-tradingview-chart.mjs','utf8');
 try{
  for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:844}});
   let widgetRequests=0;
   await context.route('**/*',async route=>{
    const url=route.request().url();
    if(url===base+'widget-fixture.html'){
     await route.fulfill({contentType:'text/html',body:'<!doctype html><input id="draft" value="unsaved"><div id="buttons"></div><script type="module">import {createTickerChartButton} from "./src/ui/pilot-tradingview-chart.mjs";for(const t of ["TSLA","USD","UNKNOWN"])document.querySelector("#buttons").append(createTickerChartButton(t));</script>'});return;
    }
    if(url===base+'src/ui/pilot-tradingview-chart.mjs'){await route.fulfill({contentType:'text/javascript',body:source});return;}
    if(url.startsWith('https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=kr')){
     widgetRequests++;await route.fulfill({contentType:'text/html',body:'<!doctype html><p id="mock-widget"></p><script>const result=document.querySelector("#mock-widget");try{parent.document.body;result.textContent="FAIL"}catch{result.textContent="ISOLATED"}document.documentElement.dataset.origin=location.origin;</script>'});return;
    }
    await route.abort();
   });
   const page=await context.newPage();await page.goto(base+'widget-fixture.html');
   const first=page.getByRole('button',{name:'TSLA 주가 차트 열기'});
   await first.waitFor();assert.equal(widgetRequests,0);
   await first.click();const dialog=page.locator('#investlabTradingViewDialog');
   assert.equal(await dialog.isVisible(),true);
   const iframe=dialog.locator('iframe');
   assert.equal(await iframe.getAttribute('sandbox'),'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
   assert.equal(await iframe.getAttribute('srcdoc'),null);
   assert.equal(JSON.parse(decodeURIComponent(new URL(await iframe.getAttribute('src')).hash.slice(1))).symbol,'NASDAQ:TSLA');
   await iframe.contentFrame().locator('#mock-widget').waitFor();
   assert.equal(await iframe.contentFrame().locator('#mock-widget').textContent(),'ISOLATED');
   assert.equal(await iframe.contentFrame().locator('html').getAttribute('data-origin'),'https://www.tradingview-widget.com');
   await dialog.getByRole('button',{name:'차트 다시 불러오기'}).click();
   await iframe.contentFrame().locator('#mock-widget').waitFor();
   assert.equal(widgetRequests,2);
   await dialog.getByRole('button',{name:'닫기'}).click();
   assert.equal(await dialog.isVisible(),false);assert.equal(await iframe.count(),0);
   assert.equal(await first.evaluate(el=>document.activeElement===el),true);
   assert.equal(await page.locator('#draft').inputValue(),'unsaved');
   await page.getByRole('button',{name:'USD 주가 차트 열기'}).click();
   assert.equal(JSON.parse(decodeURIComponent(new URL(await dialog.locator('iframe').getAttribute('src')).hash.slice(1))).symbol,'AMEX:USD');
   await dialog.getByRole('button',{name:'닫기'}).click();
   await page.getByRole('button',{name:'UNKNOWN 주가 차트 열기'}).click();
   assert.equal(await dialog.locator('iframe').count(),0);
   assert.match(await dialog.getByRole('link').getAttribute('href'),/symbol=UNKNOWN/);
   await dialog.getByRole('button',{name:'닫기'}).click();await context.close();
  }
 }finally{await browser.close();}
});
