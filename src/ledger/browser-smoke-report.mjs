const CASES=['NORMAL','QUANTITY','OWNERSHIP_COST','FILE_INTEGRITY'];
const STATES=['PASS','FAIL','NOT_RUN'];
export function createBrowserSmokeReport({results,environment={},createdAt}={}){
 if(!Array.isArray(results)||results.length!==CASES.length||typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt)))throw Error('invalid smoke report');
 const seen=new Set();
 const normalized=results.map(r=>{
  if(!r||!CASES.includes(r.caseId)||seen.has(r.caseId)||!STATES.includes(r.status)||typeof r.note!=='string'||r.note.length>1000)throw Error('invalid smoke case');
  seen.add(r.caseId);
  return {caseId:r.caseId,status:r.status,note:r.note};
 });
 if(!environment||typeof environment!=='object'||Array.isArray(environment))throw Error('invalid environment');
 const browser=String(environment.browser??'').slice(0,150),platform=String(environment.platform??'').slice(0,150);
 return {format:'INVESTLAB_TEST_BROWSER_SMOKE',version:1,createdAt,environment:{browser,platform},results:normalized,summary:{passed:normalized.filter(r=>r.status==='PASS').length,failed:normalized.filter(r=>r.status==='FAIL').length,notRun:normalized.filter(r=>r.status==='NOT_RUN').length},verification:'MANUAL_SELF_REPORTED',serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
}
