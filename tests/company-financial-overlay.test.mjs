import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Company Investment Analysis identifies KPI ticker and aligns price, revenue and CAPEX on one time axis',()=>{
 const html=readFileSync(new URL('../company-investment-analysis.html',import.meta.url),'utf8');
 assert.equal((html.match(/id="priceChart"/g)||[]).length,1);
 assert.doesNotMatch(html,/id="financeChart"/);
 assert.match(html,/id="financialTicker"/);
 for(const name of ['lastPriceLabel','periodReturnLabel','firstPriceLabel','lastDateLabel'])
  assert.match(html,new RegExp('id="'+name+'"'));
 assert.match(html,/finance:financeCache\.get\(selected\)\|\|\[\]/);
 assert.match(html,/financialTrack\("revenue_usd_bn"/);
 assert.match(html,/financialTrack\("capex_usd_bn"/);
 assert.match(html,/t>=tMin&&t<=tMax/);
 assert.match(html,/\.select\("fiscal_period,period_end,revenue_usd_bn,capex_usd_bn,capex_definition,source_url"\)/);
});
