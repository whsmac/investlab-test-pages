import {reviewIsolationEvidenceTemplate} from './isolation-evidence-template.mjs';
export function parseIsolationEvidenceDocument(value){
 let data=value;
 if(typeof value==='string'){if(new TextEncoder().encode(value).length>1024*1024)throw Error('evidence file exceeds 1MiB');try{data=JSON.parse(value)}catch{throw Error('invalid evidence JSON')}}
 const review=reviewIsolationEvidenceTemplate(data);
 const cases=data.cases.map(c=>({id:c.id,expected:c.expected,observed:c.observed,method:c.method,evidenceReference:c.evidenceReference,
  status:c.observed===null?'UNVERIFIED':c.observed!==c.expected?'FAILED':!['SQL_EDITOR','CLIENT_SESSION','LOG_REVIEW'].includes(c.method)||typeof c.evidenceReference!=='string'||!c.evidenceReference.trim()?'EVIDENCE_MISSING':'MANUAL_MATCH'}));
 return {format:'INVESTLAB_TEST_ISOLATION_EVIDENCE_ASSESSMENT_V1',status:cases.some(c=>c.status==='FAILED')?'FAILED':cases.some(c=>c.status!=='MANUAL_MATCH')?'INCOMPLETE':'MANUAL_EVIDENCE_COMPLETE',
  cases,issues:review.issues,missing:review.missing,failures:review.failures,serverVerified:false,canMigrate:false,authorization:'NONE',
  warning:'This validates structure and self-reported observations only, not server logs or session identity.'};
}
