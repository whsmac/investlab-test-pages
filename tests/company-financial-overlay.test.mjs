import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {alignCompanyPriceSeries} from '../src/market/align-company-price-series.mjs';

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
 assert.match(html,/\.select\("fiscal_period,period_end,revenue_usd_bn,capex_usd_bn,operating_income_usd_bn,operating_margin_pct,source_url"\)/);
 assert.doesNotMatch(html,/<th>CAPEX 기준<\/th>/);
 assert.match(html,/<th>영업이익 \(십억 USD\)<\/th><th>영업이익률 \(%\)<\/th>/);
 assert.match(html,/r\.operating_income_usd_bn/);
 assert.match(html,/r\.operating_margin_pct/);
 assert.match(html,/r\.period_end>=from/);
 assert.match(html,/value="3y"/);
 assert.match(html,/value="5y"/);
 assert.match(html,/id="historyCoverageStatus"/);
 assert.match(html,/alignCompanyPriceSeries\(active,series,isoDate/);
 assert.match(html,/각자 첫 거래일을 100으로/);
 assert.match(html,/확보 구간 수익률/);
});

test('Five-year TSLA comparison is not clipped to SPCX start date',()=>{
 const series=new Map([
  ['TSLA',[{date:'2021-11-22',close:100},{date:'2026-11-19',close:200}]],
  ['SPCX',[{date:'2026-06-12',close:100},{date:'2026-11-19',close:180}]]
 ]);
 const result=alignCompanyPriceSeries(['TSLA','SPCX'],series,'2021-11-20');
 assert.equal(result.commonStart,'2021-11-22');
 assert.equal(result.aligned.get('TSLA')[0].date,'2021-11-22');
 assert.equal(result.aligned.get('SPCX')[0].date,'2026-06-12');
 assert.deepEqual(result.lateStarts,[{ticker:'SPCX',date:'2026-06-12'}]);
 assert.deepEqual(result.partialStarts,[{ticker:'SPCX',date:'2026-06-12'}]);
});

test('Short snapshots still align overlapping dates and disclose limited coverage',()=>{
 const series=new Map([
  ['MSFT',[{date:'2026-10-21',close:200},{date:'2026-11-19',close:300}]],
  ['TSLA',[{date:'2026-10-22',close:400},{date:'2026-11-19',close:500}]]
 ]);
 const result=alignCompanyPriceSeries(['MSFT','TSLA'],series,'2021-11-20');
 assert.equal(result.commonStart,'2026-10-22');
 assert.deepEqual(result.aligned.get('MSFT').map(r=>r.date),['2026-11-19']);
 assert.equal(result.partialStarts.length,2);
});
