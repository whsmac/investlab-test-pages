import {TEST_PREFLIGHT_CHECKS} from './test-migration-preflight.mjs';
import {ISOLATION_CASES,assessIsolationEvidence} from './isolation-evidence-review.mjs';
const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
export function validateReadinessReport(input){
 let d=input;
 if(typeof d==='string'){if(new TextEncoder().encode(d).length>1024*1024)throw Error('report exceeds 1MiB');try{d=JSON.parse(d)}catch{throw Error('invalid JSON')}}
 if(!d||typeof d!=='object'||Array.isArray(d)||d.format!=='INVESTLAB_TEST_PREFLIGHT_REVIEW_V2')throw Error('unsupported report format');
 if(!d.preflight||!d.isolation||!Array.isArray(d.preflight.checks)||!Array.isArray(d.isolation.cases))throw Error('missing report sections');
 const checks=d.preflight.checks,iso=d.isolation.cases;
 if(checks.length!==TEST_PREFLIGHT_CHECKS.length||iso.length!==ISOLATION_CASES.length)throw Error('required case count mismatch');
 const pids=new Set(),iids=new Set();
 for(const c of checks){const def=TEST_PREFLIGHT_CHECKS.find(x=>x.id===c.id);if(!def||pids.has(c.id)||c.kind!==def.kind||!['VERIFIED','FAILED','NOT_VERIFIED'].includes(c.status))throw Error('invalid or duplicate preflight check');pids.add(c.id)}
 const blockers=checks.filter(c=>c.status!=='VERIFIED').map(c=>c.id);
 if(!Array.isArray(d.preflight.blockers)||!same(blockers,d.preflight.blockers))throw Error('preflight blocker mismatch');
 const observations={};
 for(const c of iso){const def=ISOLATION_CASES.find(x=>x.id===c.id);if(!def||iids.has(c.id)||c.expected!==def.expected||!['ALLOW','DENY',null].includes(c.actual))throw Error('invalid or duplicate isolation case');iids.add(c.id);observations[c.id]=c.actual}
 const assessed=assessIsolationEvidence(observations);
 for(const c of iso){const recomputed=assessed.cases.find(x=>x.id===c.id);if(c.status!==recomputed.status)throw Error('isolation status mismatch')}
 if(d.isolation.status!==assessed.status||!same(d.isolation.failures??[],assessed.failures)||!same(d.isolation.missing??[],assessed.missing))throw Error('isolation summary mismatch');
 if(!Array.isArray(d.isolationBlockers)||!same(d.isolationBlockers,[...assessed.failures,...assessed.missing]))throw Error('combined isolation blockers mismatch');
 if(!Array.isArray(d.preflight.catalogBlockers)||typeof d.preflight.catalogStatus!=='string')throw Error('catalog evidence summary missing');
 if(d.status==='MANUAL_REVIEW_COMPLETE_NOT_SERVER_VERIFIED'&&(blockers.length||d.preflight.catalogBlockers.length||assessed.status!=='MANUAL_EVIDENCE_RECORDED'))throw Error('false completion claim');
 if(d.serverVerified===true||d.canMigrate===true||d.canExecuteSql===true||d.canMerge===true||d.authorization!=='NONE')throw Error('unauthorized approval claim');
 return {format:'INVESTLAB_TEST_READINESS_VALIDATION_V1',status:'BLOCKED_PENDING_INDEPENDENT_VERIFICATION',preflightBlockers:blockers,catalogBlockers:d.preflight.catalogBlockers,isolationBlockers:[...assessed.failures,...assessed.missing],catalogVerified:false,serverVerified:false,canMigrate:false,authorization:'NONE',warning:'V2 contains catalog conclusions but not independently verifiable raw audit. Rechecking structure does not authenticate evidence.'};
}
