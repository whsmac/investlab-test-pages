import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('per-holding market value and P&L columns',()=>{assert.match(html,/<th>평가금액 USD<\/th><th>평가손익 USD<\/th>/);assert.match(html,/lastPortfolioValuation\?\.rows\.find\(item=>item\.ticker===ticker\)/);assert.match(html,/\[\[value\?\.marketValueUsd,marketText\],\[value\?\.unrealizedPnlUsd,pnlText\]\]/);assert.match(html,/const marketText=value\?\.marketValueUsd==null/);assert.match(html,/const pnlText=value\?\.unrealizedPnlUsd==null/);assert.match(html,/value\?\.status==='COST_MISSING'/);});
test('valuation cache invalidated when prices, costs, or account changes',()=>{assert.match(html,/function markValuationStale\(\)\{[\s\S]*?invalidateYahooComparison\(\);[\s\S]*?lastPortfolioValuation=null/);assert.match(html,/lastPortfolioValuation=result;show\(\)/);assert.match(html,/addEventListener\('change',\(\)=>\{invalidateYahooComparison\(\);lastYahooPriceDisplay=new Map\(\);lastPortfolioValuation=null;resetValuationSummary\('계좌 변경[^']*'\);el\('valuation-completion-status'\)\.dataset\.state='stale';el\('valuation-completion-status'\)\.textContent='계좌 변경[^']*';el\('yahoo-valuation-preview'\)\.disabled=false;show\(\);rebuildAssumedPriceRows\(\)/);});
test('module parses',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(r.status,0,r.stderr);});

test('holdings table CSS keeps sticky identifiers and readable aligned numbers',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
 assert.ok(css);
 assert.ok(!css.includes('()=>".holding-table-scroll'));
 assert.ok(!css.includes('z-index:3}".holding-table-scroll'));
 assert.ok(css.includes('.holding-table-scroll th:nth-child(2),.holding-table-scroll td:nth-child(2){position:sticky'));
 assert.ok(css.includes('.holding-table-scroll th:nth-child(n+3),.holding-table-scroll td:nth-child(n+3){text-align:right}'));
 assert.ok(css.includes('@media(max-width:640px)'));
 assert.ok(css.includes('overflow-x:auto'));
});

test('missing acquisition cost does not suppress known market value',()=>{
 assert.match(html,/const missingPrice=value\?\.status==='PRICE_MISSING'/);
 assert.match(html,/const marketText=value\?\.marketValueUsd==null\?\(missingPrice/);
 assert.match(html,/const pnlText=value\?\.unrealizedPnlUsd==null\?\(missingPrice/);
 assert.match(html,/\[\[value\?\.marketValueUsd,marketText\],\[value\?\.unrealizedPnlUsd,pnlText\]\]/);
});

test('summary identifies missing quote and acquisition-cost tickers without inventing totals',()=>{
 assert.match(html,/function valuationMissingReason\(result\)/);
 assert.match(html,/row\.status==='PRICE_MISSING'/);
 assert.match(html,/row\.status==='COST_MISSING'/);
 assert.match(html,/주가 없음 /);
 assert.match(html,/매입단가 없음 /);
 assert.match(html,/valuationMissingReason\(result\.latest\)/);
 assert.match(html,/valuationMissingReason\(result\)/);
});

test('missing-input navigation exposes ticker-specific focus targets',()=>{
 assert.match(html,/button\.setAttribute\('aria-label',ticker\+' '\+\(kind==='price'/);
 assert.match(html,/showHoldingDetail\(ticker\)/);
 assert.match(html,/target\.scrollIntoView\(\{behavior:'smooth',block:'center'\}\);target\.focus\(\)/);
});
test('holdings sort dropdown contains no stray expression text',()=>{
 const dropdown=html.match(/<select id="holding-sort">([\s\S]*?)<\/select>/)?.[1];
 assert.ok(dropdown);
 assert.doesNotMatch(dropdown,/\(\)=>'/);
 assert.match(dropdown,/<option value="quantity-asc">보유수량 적은 순<\/option>/);
});

test('mobile missing-input actions have accessible touch targets and holdings can scroll horizontally',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
 assert.ok(css);
 assert.match(css,/@media\(max-width:640px\)\{\.holding-recalculate-all/);
 assert.match(css,/\.missing-input-jump\{min-height:44px;flex:1 1 120px/);
 assert.match(css,/\.holding-table-scroll\{max-width:100%;overflow-x:auto/);
});

test('holdings numeric columns keep readable spacing and right-aligned editable prices',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
 assert.ok(css);
 assert.match(css,/\.holding-table-scroll input\[type=number\]\{min-width:92px;text-align:right/);
 assert.match(css,/\.holding-table-scroll th:nth-child\(n\+3\),\.holding-table-scroll td:nth-child\(n\+3\)\{padding-inline:10px\}/);
 assert.match(css,/\.holding-table-scroll th:nth-child\(2\),\.holding-table-scroll td:nth-child\(2\)\{position:sticky;left:48px/);
});
