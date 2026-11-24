import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateLocalSecChartReview,quarterPath,reviewRowsForTicker} from '../src/market/sec-local-chart-review.mjs';
const url='https://www.sec.gov/Archives/edgar/data/789019/000000000025000001/';
const row={ticker:'MSFT',period_end:'2025-06-30',fiscal_period:'2025-Q4',status:'SEC_LOCAL_REVIEW',revenue_usd_bn:100,capex_usd_bn:null,operating_income_usd_bn:25,operating_margin_pct:25,metric_status:{revenue_usd_bn:'zip_match',capex_usd_bn:'missing',operating_income_usd_bn:'source_arithmetic_checked',operating_margin_pct:'source_arithmetic_checked'},filing_urls:{revenue_usd_bn:[url],operating_income_usd_bn:[url]}};
function input(){return {format:'INVESTLAB_SEC_LOCAL_CHART_REVIEW_V1',source:'SEC Company Facts / user supplied archive',as_of:'2025-11-24',publication_allowed:false,database_writes:0,rows:[structuredClone(row)]}}
test('review data keeps fiscal quarter and missing values, filters issuer',()=>{
 const rows=validateLocalSecChartReview(input());assert.equal(rows[0].capex_usd_bn,null);assert.equal(rows[0].fiscal_period,'2025-Q4');assert.equal(reviewRowsForTicker(rows,'TSLA').length,0);
});
test('wrong issuer, duplicate quarter, future period, margin and malicious links rejected',()=>{
 for(const mutate of [
  p=>p.rows[0].ticker='unknown',p=>p.rows.push(structuredClone(row)),p=>p.rows[0].period_end='2025-12-31',p=>p.rows[0].fiscal_period='2025-Q2',
  p=>p.rows[0].operating_margin_pct=30,p=>p.rows[0].filing_urls.revenue_usd_bn=['javascript:alert(1)'],p=>p.rows[0].capex_usd_bn=0,
  p=>p.publication_allowed=true,p=>p.database_writes=1
 ]){const p=input();mutate(p);assert.throws(()=>validateLocalSecChartReview(p));}
});
test('missing quarters break graph paths',()=>{
 const points=[{date:'2024-12-31',v:1},{date:'2025-03-31',v:2},{date:'2025-09-30',v:3}];
 assert.equal(quarterPath(points,p=>p.v,p=>p.v),'M1.00,1.00 L2.00,2.00 M3.00,3.00');
});
test('local review mode is independent of server and never writes storage',()=>{
 const html=readFileSync(new URL('../company-investment-analysis.html',import.meta.url),'utf8');
 const section=html.slice(html.indexOf('$("secLocalReviewFile").addEventListener'),html.indexOf('$("financialTicker").addEventListener'));
 assert.match(section,/validateLocalSecChartReview\(JSON.parse\(await file.text\(\)\)\)/);
 assert.doesNotMatch(section,/localStorage|\.upsert\(|\.insert\(|\.update\(|\.rpc\(/);
 const finance=html.slice(html.indexOf('async function loadFinance()'),html.indexOf('async function loadAll()'));
 assert.ok(finance.indexOf('if(localSecReview||(useStaticSec&&staticSecReview))')<finance.indexOf('if(!client)await connect()'));
 assert.match(html,/quarterPath\(pairs/);
});
