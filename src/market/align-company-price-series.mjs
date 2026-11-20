// TEST-only company chart alignment. Keep a full long-history comparison
// instead of cutting all companies down to a recently listed ticker's first day.
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const DAY=86400000;
export function alignCompanyPriceSeries(active,series,from){
 if(!Array.isArray(active)||!(series instanceof Map)||!ISO.test(from))throw Error("잘못된 기업 비교 기간");
 const fromMs=Date.parse(from+"T00:00:00Z");
 if(!Number.isFinite(fromMs))throw Error("조회기간 날짜 오류");
 const valid=active.filter(t=>Array.isArray(series.get(t))&&series.get(t).length>0);
 const firstDate=t=>series.get(t)[0].date;
 const early=valid.filter(t=>Date.parse(firstDate(t)+"T00:00:00Z")<=fromMs+14*DAY);
 // If at least one ticker has the requested long history, do not let a new
 // listing erase it from the horizontal axis for everyone else.
 const candidates=early.length?early:valid;
 const commonStart=active.length>1&&candidates.length
  ?candidates.map(firstDate).sort().at(-1):null;
 const aligned=new Map(active.map(t=>{
  const rows=Array.isArray(series.get(t))?series.get(t):[];
  return [t,rows.filter(p=>!commonStart||p.date>=commonStart)];
 }));
 const lateStarts=commonStart?valid.filter(t=>firstDate(t)>commonStart)
  .map(t=>({ticker:t,date:firstDate(t)})):[];
 const partialStarts=valid.filter(t=>
  Date.parse(firstDate(t)+"T00:00:00Z")>fromMs+21*DAY)
  .map(t=>({ticker:t,date:firstDate(t)}));
 const missing=active.filter(t=>!valid.includes(t));
 return {commonStart,aligned,lateStarts,partialStarts,missing};
}
