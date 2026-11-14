import {createBrowserSmokeReport} from './browser-smoke-report.mjs';
const KEY=['NORMAL','QUANTITY','OWNERSHIP_COST','FILE_INTEGRITY'];
export function validateBrowserSmokeReport(saved){
 if(!saved||saved.format!=='INVESTLAB_TEST_BROWSER_SMOKE'||saved.version!==1||saved.verification!=='MANUAL_SELF_REPORTED'||saved.serverVerified!==false||saved.canMigrate!==false||saved.canPost!==false||saved.authorization!=='NONE')throw Error('unsafe or unsupported browser smoke report');
 const rebuilt=createBrowserSmokeReport({results:saved.results,environment:saved.environment,createdAt:saved.createdAt});
 if(JSON.stringify(rebuilt)!==JSON.stringify({...rebuilt,...saved,summary:rebuilt.summary,results:rebuilt.results,environment:rebuilt.environment}))throw Error('invalid browser smoke report structure');
 if(JSON.stringify(saved.summary)!==JSON.stringify(rebuilt.summary))throw Error('browser smoke summary mismatch');
 return rebuilt;
}
export function compareBrowserSmokeReports({saved,current}={}){
 const before=validateBrowserSmokeReport(saved),after=validateBrowserSmokeReport(current);
 const old=new Map(before.results.map(x=>[x.caseId,x]));
 const rows=KEY.map(caseId=>{const a=old.get(caseId),b=after.results.find(x=>x.caseId===caseId);return {caseId,previous:a.status,current:b.status,changed:a.status!==b.status,improved:a.status==='FAIL'&&b.status==='PASS',regressed:a.status==='PASS'&&b.status==='FAIL',previousNote:a.note,currentNote:b.note}});
 return {rows,improved:rows.filter(x=>x.improved).length,regressed:rows.filter(x=>x.regressed).length,changed:rows.filter(x=>x.changed).length,previousDate:before.createdAt,currentDate:after.createdAt,serverVerified:false,canMigrate:false,canPost:false};
}
