// Local review input only. No network, storage, or database writes.
const CIK={MSFT:789019,GOOGL:1652044,AMZN:1018724,META:1326801,TSLA:1318605,SPCX:1181412};
export const fields=['revenue_usd_bn','capex_usd_bn','operating_income_usd_bn','operating_margin_pct'];
const statuses=new Set(['zip_match','source_arithmetic_checked','definition_review','missing']);
export const reviewLabel={zip_match:'ZIP 교차 일치',source_arithmetic_checked:'원천값·산술 검토',definition_review:'CAPEX 정의 검토',missing:'미확보'};
export function quarterIndex(d){return Number(d.slice(0,4))*4+Number(d.slice(5,7))/3-1;}
function endOfQuarter(s){
 if(typeof s!=='string'||!/^\d{4}-(03-31|06-30|09-30|12-31)$/.test(s))throw Error('분기 종료일 오류');
 return s;
}
export function validateLocalSecChartReview(payload){
 if(payload?.format!=='INVESTLAB_SEC_LOCAL_CHART_REVIEW_V1'||payload.source!=='SEC Company Facts / user supplied archive'||payload.publication_allowed!==false||payload.database_writes!==0||!Array.isArray(payload.rows)||!payload.rows.length||payload.rows.length>300)throw Error('검토용 SEC 파일 형식 오류');
 const asOf=payload.as_of;
 if(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isFinite(Date.parse(asOf+'T00:00:00Z'))||new Date(asOf+'T00:00:00Z').toISOString().slice(0,10)!==asOf||asOf>new Date().toISOString().slice(0,10))throw Error('검토 기준일 오류');
 const seen=new Set();
 return payload.rows.map(r=>{
  if(!r||!Object.hasOwn(CIK,r.ticker)||r.status!=='SEC_LOCAL_REVIEW')throw Error('기업 또는 검토 상태 오류');
  const d=endOfQuarter(r.period_end),y=Number(d.slice(0,4)),m=Number(d.slice(5,7));
  const fy=y+(r.ticker==='MSFT'&&m>=7?1:0),fq=r.ticker==='MSFT'?Math.floor((m+5)%12/3)+1:m/3;
  const key=r.ticker+':'+d;
  if(y<2021||d>asOf||seen.has(key)||r.fiscal_period!==fy+'-Q'+fq)throw Error('중복 또는 회계분기 오류');
  seen.add(key);
  const clean={ticker:r.ticker,period_end:d,fiscal_period:r.fiscal_period,status:r.status,metric_status:{},filing_urls:{}};
  for(const f of fields){
   const v=r[f],s=r.metric_status?.[f];
   if(!statuses.has(s)||(v===null)!==(s==='missing')||(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e6)))throw Error('금액 또는 검토 상태 오류');
   if(s==='definition_review'&&(f!=='capex_usd_bn'||r.ticker!=='AMZN'))throw Error('CAPEX 검토 구분 오류');
   if(v!==null&&f!=='operating_margin_pct'){
    const urls=r.filing_urls?.[f];
    const pattern=new RegExp('^https://www\\.sec\\.gov/Archives/edgar/data/'+CIK[r.ticker]+'/\\d{18}/$');
    if(!Array.isArray(urls)||!urls.length||urls.length>2||urls.some(u=>typeof u!=='string'||!pattern.test(u)))throw Error('공시 원문 링크 오류');
    clean.filing_urls[f]=[...urls];
   }
   clean[f]=v;clean.metric_status[f]=s;
  }
  if(clean.revenue_usd_bn===null||clean.revenue_usd_bn<=0||clean.capex_usd_bn<0)throw Error('재무 금액 오류');
  const op=clean.operating_income_usd_bn,margin=clean.operating_margin_pct;
  if((op===null)!==(margin===null)||(op!==null&&Math.abs(margin-op/clean.revenue_usd_bn*100)>.00051))throw Error('영업이익률 계산 오류');
  return clean;
 }).sort((a,b)=>a.ticker.localeCompare(b.ticker)||a.period_end.localeCompare(b.period_end));
}
export function reviewRowsForTicker(rows,ticker){
 return rows.filter(r=>r.ticker===ticker);
}
// Break line segments when a quarter is absent; do not interpolate missing quarters.
export function quarterPath(points,x,y){
 return points.map((p,i)=>(i&&quarterIndex(p.date)-quarterIndex(points[i-1].date)===1?'L':'M')+x(p).toFixed(2)+','+y(p).toFixed(2)).join(' ');
}
