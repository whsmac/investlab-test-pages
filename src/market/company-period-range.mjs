// Stable TEST Company Analysis look-back dates.
// Anchor to Korea Standard Time and clamp calendar month-end rather than
// allowing Date.setUTCMonth() to overflow (e.g. May 31 - 3 months).
const MONTHS=Object.freeze({"3m":3,"6m":6,"1y":12,"3y":36,"5y":60});
const SEOUL_OFFSET_MS=9*60*60*1000;
const ISO=/^\d{4}-\d{2}-\d{2}$/;
export function companyPeriodStart(period,at=new Date()){
 const months=MONTHS[period];
 if(!Number.isInteger(months))throw Error("지원되지 않는 조회 기간");
 const now=new Date(at);
 if(!Number.isFinite(now.getTime()))throw Error("조회 기준일 오류");
 const kst=new Date(now.getTime()+SEOUL_OFFSET_MS);
 const year=kst.getUTCFullYear(),month=kst.getUTCMonth(),day=kst.getUTCDate();
 const targetMonth=year*12+month-months;
 const targetYear=Math.floor(targetMonth/12),targetIndex=targetMonth-targetYear*12;
 const maxDay=new Date(Date.UTC(targetYear,targetIndex+1,0)).getUTCDate();
 const result=new Date(Date.UTC(targetYear,targetIndex,Math.min(day,maxDay)));
 const iso=result.toISOString().slice(0,10);
 if(!ISO.test(iso))throw Error("조회 시작일 오류");
 return iso;
}
