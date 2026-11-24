// SEC review only: reconstruct display observations from original extracted evidence.
// A comparison with the pinned previous snapshot is required; nothing is published.
import {validateLocalSecChartReview} from './sec-local-chart-review.mjs';
import {planSecRefresh} from './sec-refresh-review.mjs';
const CIK={MSFT:789019,GOOGL:1652044,AMZN:1018724,META:1326801,TSLA:1318605,SPCX:1181412};
const metrics={
 revenue_usd_bn:['RevenueFromContractWithCustomerExcludingAssessedTax','SalesRevenueNet','Revenues'],
 operating_income_usd_bn:['OperatingIncomeLoss'],
 capex_usd_bn:['PaymentsToAcquirePropertyPlantAndEquipment']
};
const format='INVESTLAB_SEC_LOCAL_CHART_REVIEW_V1',source='SEC Company Facts / user supplied archive';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function dayAfter(d){return new Date(Date.parse(d+'T00:00:00Z')+86400000).toISOString().slice(0,10);}
function priorQuarter(d){
 const x=new Date(d+'T00:00:00Z');return new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()-2,0)).toISOString().slice(0,10);
}
function money(f){
 if(typeof f.value_usd!=='string'||!(/^-?\d{1,15}$/.test(f.value_usd)))throw Error('Invalid evidence USD amount');
 return BigInt(f.value_usd);
}
export function toChartCandidate(input){
 if(input?.format!=='INVESTLAB_SEC_COMPANY_FACTS_REVIEW_V1'||input.publication_allowed!==false||input.database_writes!==0||input.filing_reconciled!==false||!validDate(input.as_of)||!Array.isArray(input.rows)||!input.rows.length||input.rows.length>300)throw Error('Invalid Company Facts review');
 const rows=input.rows.map(r=>{
  if(!r||!Object.hasOwn(CIK,r.ticker)||r.status!=='SEC_COMPANY_FACTS_REVIEW_ONLY'||!validDate(r.period_end)||r.period_end>input.as_of||!r.provenance)throw Error('Invalid review row');
  const date=r.period_end,prior=priorQuarter(date),start=dayAfter(prior);
  const row={ticker:r.ticker,period_end:date,fiscal_period:r.fiscal_period,status:'SEC_LOCAL_REVIEW',metric_status:{},filing_urls:{}};
  for(const [field,tags] of Object.entries(metrics)){
   const value=r[field],proof=r.provenance[field];
   if(value===null){if(proof)throw Error('Missing amount has evidence');row[field]=null;row.metric_status[field]='missing';continue;}
   if(typeof value!=='number'||!Number.isFinite(value)||!proof||!Array.isArray(proof.facts))throw Error('Missing or invalid evidence');
   const alternative=r.ticker==='AMZN'&&field==='capex_usd_bn';
   for(const f of proof.facts){
    if(!f||(!tags.includes(f.tag)&&!(alternative&&f.tag==='PaymentsToAcquireProductiveAssets'))||!validDate(f.start)||!validDate(f.end)||!validDate(f.filed)||f.start>f.end||f.end>f.filed||f.filed>input.as_of||!(/^\d{10}-\d{2}-\d{6}$/.test(f.accession))||f.filing_url!=='https://www.sec.gov/Archives/edgar/data/'+CIK[r.ticker]+'/'+f.accession.replaceAll('-','')+'/')throw Error('Invalid filing evidence');
   }
   let amount;
   if(proof.mode==='direct'&&proof.facts.length===1){
    const [f]=proof.facts;
    if(f.start!==start||f.end!==date)throw Error('Incorrect direct quarter');
    amount=money(f);
   }else if(['same_start_ytd_delta_unreconciled','ytd_delta_unreconciled'].includes(proof.mode)&&proof.facts.length===2){
    const [a,b]=proof.facts;
    const m=Number(date.slice(5,7)),y=Number(date.slice(0,4)),fiscalStart=r.ticker==='MSFT'?(m>=7?y:y-1)+'-07-01':y+'-01-01';
    if(a.start!==fiscalStart||a.start!==b.start||a.end!==date||b.end!==prior||b.filed>a.filed||a.tag!==b.tag)throw Error('Incorrect cumulative evidence');
    amount=money(a)-money(b);
   }else throw Error('Unknown evidence calculation');
   if(Number(amount)/1e9!==value)throw Error('Source arithmetic mismatch');
   row[field]=value;
   row.filing_urls[field]=[...new Set(proof.facts.map(f=>f.filing_url))];
   row.metric_status[field]=proof.facts.some(f=>f.tag==='PaymentsToAcquireProductiveAssets')?'definition_review':'source_arithmetic_checked';
  }
  row.operating_margin_pct=r.operating_margin_pct;
  row.metric_status.operating_margin_pct=row.operating_margin_pct===null?'missing':'source_arithmetic_checked';
  return row;
 });
 const payload={format,source,as_of:input.as_of,publication_allowed:false,database_writes:0,rows};
 return {...payload,rows:validateLocalSecChartReview(payload)};
}
export function prepareQuarterlyRefresh(previous,review){
 const candidate=toChartCandidate(review);
 const {report,snapshot}=planSecRefresh(previous,candidate);
 return {report:{...report,acquisition:'local supplied SEC files',automatic_acquisition_verified:false,source_filing_reconciled:false},snapshot};
}
