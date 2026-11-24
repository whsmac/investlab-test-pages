import test from 'node:test';
import assert from 'node:assert/strict';
import {planSecRefresh} from '../src/market/sec-refresh-review.mjs';
const url='https://www.sec.gov/Archives/edgar/data/789019/000000000025000001/';
const row=(d,fp)=>({ticker:'MSFT',period_end:d,fiscal_period:fp,status:'SEC_LOCAL_REVIEW',revenue_usd_bn:100,capex_usd_bn:null,operating_income_usd_bn:25,operating_margin_pct:25,metric_status:{revenue_usd_bn:'zip_match',capex_usd_bn:'missing',operating_income_usd_bn:'source_arithmetic_checked',operating_margin_pct:'source_arithmetic_checked'},filing_urls:{revenue_usd_bn:[url],operating_income_usd_bn:[url]}});
const payload=(rows,as_of='2025-11-24')=>({format:'INVESTLAB_SEC_LOCAL_CHART_REVIEW_V1',source:'SEC Company Facts / user supplied archive',as_of,publication_allowed:false,database_writes:0,rows});
const old=()=>payload([row('2025-06-30','2025-Q4')]);
const later=()=>row('2025-09-30','2026-Q1');
test('missing old row retained while new quarter staged, never publication',()=>{
 const a=old(),b=payload([later()]);const before=JSON.stringify(a);
 const x=planSecRefresh(a,b);assert.equal(x.snapshot.rows.length,2);assert.equal(x.snapshot.rows[0].metric_status.revenue_usd_bn,'zip_match');assert.equal(x.report.missingPriorRows.length,1);assert.equal(x.snapshot.publication_allowed,false);assert.equal(JSON.stringify(a),before);
});
test('historical change blocks staging even if new quarter exists',()=>{
 const a=old(),r=structuredClone(a.rows[0]);r.revenue_usd_bn=125;r.operating_margin_pct=20;
 const x=planSecRefresh(a,payload([r,later()]));assert.equal(x.snapshot,null);assert.equal(x.report.status,'BLOCKED_HISTORICAL_CONFLICT');assert.equal(x.report.conflicts.length,2);
});
test('same observation or missing new fact never erases earlier fact',()=>{
 const a=old(),b=structuredClone(a);b.rows[0].operating_income_usd_bn=null;b.rows[0].operating_margin_pct=null;b.rows[0].metric_status.operating_income_usd_bn='missing';b.rows[0].metric_status.operating_margin_pct='missing';
 assert.equal(planSecRefresh(a,b).snapshot,null);assert.equal(a.rows[0].operating_income_usd_bn,25);
});
test('fills require explicit review and do not silently replace prior rows',()=>{
 const a=old(),b=structuredClone(a);b.rows[0].capex_usd_bn=10;b.rows[0].metric_status.capex_usd_bn='source_arithmetic_checked';b.rows[0].filing_urls.capex_usd_bn=[url];b.rows.push(later());
 const x=planSecRefresh(a,b);assert.equal(x.report.pendingFills.length,1);assert.equal(x.snapshot.rows[0].capex_usd_bn,null);
});
test('older or invalid candidate rejected, prior unchanged',()=>{
 const a=old();assert.throws(()=>planSecRefresh(a,payload([a.rows[0]],'2025-10-01')));assert.throws(()=>planSecRefresh(a,payload([])));assert.equal(a.rows.length,1);
});
