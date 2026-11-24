import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeSecSnapshot} from '../src/market/load-sec-static-snapshot.mjs';
import {toChartCandidate,prepareQuarterlyRefresh} from '../src/market/sec-quarterly-refresh-package.mjs';
const previous={format:'INVESTLAB_SEC_LOCAL_CHART_REVIEW_V1',source:'SEC Company Facts / user supplied archive',as_of:'2026-11-24',publication_allowed:false,database_writes:0,rows:decodeSecSnapshot(readFileSync(new URL('../data/sec-financial-review-20261124.txt',import.meta.url),'utf8'))};
const fact=(tag,value,start='2026-07-01',end='2026-09-30')=>({tag,value_usd:String(value),start,end,filed:'2026-10-28',accession:'0001193125-26-436133',filing_url:'https://www.sec.gov/Archives/edgar/data/789019/000119312526436133/'});
const proof=(tag,v)=>({mode:'direct',facts:[fact(tag,v)]});
function input(){
 return {format:'INVESTLAB_SEC_COMPANY_FACTS_REVIEW_V1',as_of:'2026-11-24',publication_allowed:false,database_writes:0,filing_reconciled:false,rows:[{ticker:'MSFT',period_end:'2026-09-30',fiscal_period:'2027-Q1',status:'SEC_COMPANY_FACTS_REVIEW_ONLY',revenue_usd_bn:92.279,operating_income_usd_bn:45.915,capex_usd_bn:39.367,operating_margin_pct:49.757,provenance:{revenue_usd_bn:proof('RevenueFromContractWithCustomerExcludingAssessedTax',92279000000),operating_income_usd_bn:proof('OperatingIncomeLoss',45915000000),capex_usd_bn:proof('PaymentsToAcquirePropertyPlantAndEquipment',39367000000)}}]};
}
test('actual pinned baseline retained on same-quarter partial input',()=>{
 const x=prepareQuarterlyRefresh(previous,input());
 assert.equal(x.snapshot,null);assert.equal(x.report.retainedRows,117);assert.equal(x.report.missingPriorRows.length,116);assert.equal(x.report.status,'KEEP_PREVIOUS');assert.equal(x.report.automatic_acquisition_verified,false);
});
test('arithmetic, CIK source URL, wrong date or unsupported tag rejected',()=>{
 for(const mutate of [
 p=>p.rows[0].revenue_usd_bn++,
 p=>p.rows[0].provenance.revenue_usd_bn.facts[0].filing_url='https://example.com/',
 p=>p.rows[0].provenance.revenue_usd_bn.facts[0].start='2026-06-30',
 p=>p.rows[0].provenance.revenue_usd_bn.facts[0].tag='NetIncomeLoss',
 p=>p.rows[0].provenance.revenue_usd_bn.facts[0].filed='2026-12-31',
 p=>p.rows[0].operating_margin_pct=50
 ]){const p=input();mutate(p);assert.throws(()=>toChartCandidate(p));}
});
test('valid source evidence of changed historical amount blocks staging',()=>{
 const p=input();p.rows[0].capex_usd_bn=40;p.rows[0].provenance.capex_usd_bn.facts[0].value_usd='40000000000';
 const x=prepareQuarterlyRefresh(previous,p);assert.equal(x.report.status,'BLOCKED_HISTORICAL_CONFLICT');assert.equal(x.snapshot,null);
});
test('cumulative same fiscal start subtraction checked',()=>{
 const p=input(),r=p.rows[0];r.period_end='2026-06-30';r.fiscal_period='2026-Q4';
 for(const [field,tag] of [['revenue_usd_bn','RevenueFromContractWithCustomerExcludingAssessedTax'],['operating_income_usd_bn','OperatingIncomeLoss'],['capex_usd_bn','PaymentsToAcquirePropertyPlantAndEquipment']]){
  const a=fact(tag,Math.round(r[field]*1e9)+1000000000,'2025-07-01','2026-06-30'),b=fact(tag,1000000000,'2025-07-01','2026-03-31');b.filed='2026-04-29';r.provenance[field]={mode:'same_start_ytd_delta_unreconciled',facts:[a,b]};
 }
 assert.equal(toChartCandidate(p).rows[0].capex_usd_bn,39.367);
 r.provenance.capex_usd_bn.facts[1].start='2025-01-01';assert.throws(()=>toChartCandidate(p));
});
