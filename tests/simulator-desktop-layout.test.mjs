import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
test('desktop trade editor is explicitly on right independent of handoff panels',()=>{
 assert.match(html,/<section class="panel primary-trade-panel"><h2>가상 거래<\/h2>/);
 assert.match(html,/\.layout>\.primary-trade-panel\{grid-column:2;grid-row:1 \/ span 4/);
 assert.match(html,/\.layout>#testOnlineSimulatorImport,\.layout>#portfolioHandoff\{grid-column:1/);
});
test('responsive narrow screens restore normal flow',()=>{
 assert.match(html,/@media\(max-width:1050px\)\{\.layout>\.primary-trade-panel\{grid-column:auto;grid-row:auto\}\}/);
});

test('watchlist and traded-history groups are independently collapsible and preserve state across quote redraws',()=>{
 const section=html.slice(html.indexOf('function renderCompactPortfolioOverview(){'),html.indexOf('async function refreshCurrentQuotes(){'));
 assert.match(section,/expandedCategories=new Set\(\[\.\.\.root\.querySelectorAll\('details\[data-compact-category\]\[open\]'\)\]/);
 assert.match(section,/\[\['관심','관심종목'\],\['거래이력','거래이력종목'\]\]/);
 assert.match(section,/createElement\('details'\);groupDetails\.className='compact-symbol-category';groupDetails\.dataset\.compactCategory=category;groupDetails\.open=expandedCategories\.has\(category\)/);
 assert.match(section,/heading\.textContent=title\+' \('\+group\.length\+'종목\)'/);
 assert.match(section,/enableTickerChartClicks\(categoryTable\);groupDetails\.append\(categoryTable\);root\.append\(groupDetails\)/);
 assert.match(section,/enableTickerChartClicks\(holdingsTable\);root\.append\(holdingsTable\)/);
 assert.match(section,/root\.append\(summary\)/);
});

test('simulator result formatting rounds only presentation amounts and retains one decimal for USD unit prices and FX',()=>{
 const start=html.indexOf('const fmt=(v,decimals=0)=>'),end=html.indexOf('const table=',start);
 assert.ok(start>=0&&end>start);
 const {fmt,fmtPrice,fmtFx}=new Function(html.slice(start,end)+';return {fmt,fmtPrice,fmtFx};')();
 assert.equal(fmt(61580.46015797),'61,580');assert.equal(fmt(67087.46015797),'67,087');assert.equal(fmt(31.6),'32');assert.equal(fmt(134.21157895),'134');assert.equal(fmt(-0.01),'0');assert.equal(fmt(null),'—');
 assert.equal(fmtPrice(380.1),'380.1');assert.equal(fmtPrice(7.38000011),'7.4');assert.equal(fmtPrice(41),'41.0');assert.equal(fmtFx(1453.678),'1,453.7');
 assert.match(html,/byId\('taxFx'\)\.value=fmtFx\(rate\)/);assert.match(html,/fxRateSnapshot=rate/);
 assert.match(html,/fmt\(scenario\.terminalValue\)/);assert.match(html,/fmtPrice\(q\.price\)/);assert.match(html,/fmtPrice\(s\.price\)/);
});
