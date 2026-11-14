import {validateBrowserSmokeReport} from './browser-smoke-compare.mjs';
export function summarizeTestEvidence({manualReport,ci}={}){
 const manual=validateBrowserSmokeReport(manualReport);
 const ciStatus=ci?.status==='success'?'SUCCESS':ci?.status==='failure'?'FAILURE':'UNVERIFIED';
 const ciRef=typeof ci?.reference==='string'?ci.reference.slice(0,200):'';
 const complete=manual.summary.passed===4&&manual.summary.failed===0&&manual.summary.notRun===0;
 return {status:ciStatus==='SUCCESS'&&complete?'OFFLINE_TEST_EVIDENCE_REVIEWED':'TEST_EVIDENCE_INCOMPLETE',ci:{status:ciStatus,reference:ciRef,source:'MANUALLY_ENTERED_NOT_API_VERIFIED'},manual:{...manual.summary,source:'MANUAL_SELF_REPORTED'},offlineChecksComplete:complete,serverVerified:false,canPost:false,canMigrate:false,authorization:'NONE'};
}
