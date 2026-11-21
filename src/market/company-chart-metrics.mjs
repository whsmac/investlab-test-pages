// INVESTLAB TEST — read-only chart model, no database writes.
const DAY=86400000;
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const PAIRS={revenue_usd_bn:"revenue",capex_usd_bn:"capex",
 operating_income_usd_bn:"income",operating_margin_pct:"margin"};
function good(n){return n!==null&&n!==undefined&&n!==""&&Number.isFinite(Number(n));}
function fiscalBefore(period,years=0,quarters=0){
 const match=/^(\d{4})-Q([1-4])$/.exec(String(period||""));
 if(!match)return null;
 const n=Number(match[1])*4+Number(match[2])-1-years*4-quarters;
 return Math.floor(n/4)+"-Q"+(n%4+1);
}
export function enrichQuarterlyFinance(rows){
 const ordered=[...(rows||[])].sort((a,b)=>String(a.period_end).localeCompare(String(b.period_end)));
 const lookup=new Map(ordered.map(r=>[r.fiscal_period,r]));
 return ordered.map(row=>{
  const prev=lookup.get(fiscalBefore(row.fiscal_period,0,1));
  const year=lookup.get(fiscalBefore(row.fiscal_period,1,0));
  const qoq={},yoy={};
  for(const [field,key] of Object.entries(PAIRS)){
   const diff=(prior)=>{
    if(!good(row[field])||!prior||!good(prior[field]))return null;
    const current=Number(row[field]),priorValue=Number(prior[field]);
    if(field==="operating_margin_pct")return current-priorValue; // percentage points
    return priorValue===0?null:(current/priorValue-1)*100;
   };
   qoq[key]=diff(prev);yoy[key]=diff(year);
  }
  return {...row,qoq,yoy};
 });
}
export function closingExtrema(points){
 const valid=(points||[]).filter(p=>ISO.test(p.date)&&good(p.close)&&Number(p.close)>0);
 if(!valid.length)return null;
 let low=valid[0],high=valid[0];
 for(const p of valid){if(Number(p.close)<Number(low.close))low=p;if(Number(p.close)>Number(high.close))high=p;}
 return {low,high};
}
export function chartDateTicks(from,to){
 const start=Date.parse(String(from)+"T00:00:00Z"),end=Date.parse(String(to)+"T00:00:00Z");
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start) return [];
 const duration=(end-start)/DAY;
 const count=duration<=125?6:duration<=410?7:duration<=1100?6:6;
 return Array.from({length:count+1},(_,i)=>{
  const ms=start+Math.round((end-start)*i/count);
  const day=new Date(ms).toISOString().slice(0,10);
  return {date:day,time:ms,label:i===0||i===count?day:duration>=1100?day.slice(0,4):day.slice(0,7)};
 });
}
export function buildPriceComparison(active,companySeries,benchmarks,from,selectedBenchmarks=[]){
 const companyNames=(active||[]).filter(Boolean);
 const selected=(selectedBenchmarks||[]).filter(t=>t==="NDX"||t==="SPX");
 const indexed=selected.length>0;
 const names=[...companyNames,...selected];
 const source=new Map([...names.map(t=>[t,(companySeries.get(t)||[]).filter(p=>p.date>=from)]),
  ...selected.map(t=>[t,(benchmarks.get(t)||[]).filter(p=>p.date>=from)])]);
 // Base line is a common available date for established series. Newly listed
 // symbols (e.g. SPCX) begin at their own first session and are flagged.
 const startMs=Date.parse(from+"T00:00:00Z");
 const established=names.filter(t=>source.get(t)?.length&&
  Date.parse(source.get(t)[0].date+"T00:00:00Z")<=startMs+14*DAY);
 const anchors=(established.length?established:names.filter(t=>source.get(t)?.length));
 const baseline=indexed&&anchors.length?anchors.map(t=>source.get(t)[0].date).sort().at(-1):null;
 const lateStarts=[];
 const sets=names.map(t=>{
  const rows=source.get(t)||[];
  const visible=indexed&&baseline?rows.filter(p=>p.date>=baseline):rows;
  const first=visible[0]?.close;
  if(indexed&&rows.length&&baseline&&rows[0].date>baseline)lateStarts.push({ticker:t,date:rows[0].date});
  const baselinePrice=Number(first);
  return {ticker:t,benchmark:t==="NDX"||t==="SPX",baseDate:visible[0]?.date||null,
   points:visible.map(p=>({date:p.date,close:Number(p.close),value:indexed&&baselinePrice?Number(p.close)/baselinePrice*100:Number(p.close)}))};
 });
 return {indexed,sets,baseline,lateStarts,missing:names.filter(t=>!source.get(t)?.length)};
}
