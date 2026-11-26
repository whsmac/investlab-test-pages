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
