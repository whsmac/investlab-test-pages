// Public UI smoke only: no auth, no data extraction and no real user records.
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 const origin='https://whsmac.github.io/investlab-test-pages/';
 const module=await readFile('src/ui/pilot-tradingview-chart.mjs','utf8');
 await page.route(origin+'widget-live-test.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><div id="root"></div><script type="module">import {createTickerChartButton} from "./src/ui/pilot-tradingview-chart.mjs";document.querySelector("#root").append(createTickerChartButton("BITU"));</script>'}));
 await page.route(origin+'src/ui/pilot-tradingview-chart.mjs',r=>r.fulfill({contentType:'text/javascript',body:module}));
 await page.goto(origin+'widget-live-test.html');
 await page.getByRole('button',{name:'BITU 주가 차트 열기'}).click();
 const frame=page.locator('#investlabTradingViewDialog iframe');
 const locator=frame.contentFrame();
 await locator.locator('canvas').first().waitFor({state:'visible',timeout:35000});
 const rect=await locator.locator('canvas').first().boundingBox();
 if(!rect||rect.width<50||rect.height<30)throw Error('Chart canvas not visibly sized');
 console.log('LIVE_WIDGET_CANVAS_VISIBLE',JSON.stringify({width:rect.width,height:rect.height}));
}finally{await browser.close();}
