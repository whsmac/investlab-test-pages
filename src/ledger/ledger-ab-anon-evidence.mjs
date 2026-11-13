// Offline evidence validator. No SQL execution, Supabase connection or token handling.
export const REQUIRED_SECURITY_CASES=Object.freeze(['A1','A2','B1','B2','N1','N2','A3','B3','A4','A5','A6','A7','A8','A9','A10','R1']);
const RESULT=new Set(['PASS','FAIL','NOT_RUN']);
export function assessLedgerIsolationEvidence(report){
 if(!report||typeof report!=='object'||Array.isArray(report))throw Error('evidence object required');
 const issues=[];
 if(report.environment!=='TEST')issues.push('environment must be TEST');
 if(typeof report.projectRef!=='string'||!/^[a-z0-9]{20}$/.test(report.projectRef))issues.push('TEST project reference required');
 if(typeof report.sqlVersion!=='string'||!report.sqlVersion.trim())issues.push('SQL version required');
 if(!Array.isArray(report.cases))issues.push('case records required');
 const records=Array.isArray(report.cases)?report.cases:[];
 const seen=new Set();
 for(const c of records){
  if(!c||typeof c!=='object'){issues.push('invalid case record');continue;}
  if(!REQUIRED_SECURITY_CASES.includes(c.id)){issues.push('unknown case '+String(c.id));continue;}
  if(seen.has(c.id))issues.push('duplicate case '+c.id);
  seen.add(c.id);
  if(!RESULT.has(c.result))issues.push('invalid result '+c.id);
  if(c.result==='PASS'&&(!c.observed||typeof c.observed!=='string'||!c.observed.trim()))issues.push('missing observed evidence '+c.id);
  if(c.result==='PASS'&&(!c.timestamp||!Number.isFinite(Date.parse(c.timestamp))))issues.push('missing timestamp '+c.id);
  if(c.result==='PASS'&&(!Number.isInteger(c.eventsBefore)||!Number.isInteger(c.eventsAfter)||!Number.isInteger(c.legsBefore)||!Number.isInteger(c.legsAfter)))issues.push('missing before/after counts '+c.id);
 }
 for(const id of REQUIRED_SECURITY_CASES)if(!seen.has(id))issues.push('missing case '+id);
 // No client-supplied evidence can ever establish approval to deploy or verified server status.
 return Object.freeze({status:issues.length?'INCOMPLETE':'EVIDENCE_FORMAT_COMPLETE_REQUIRES_INDEPENDENT_REVIEW',issues,caseCount:seen.size,canDeploy:false,serverVerified:false,requiresIndependentReview:true});
}
