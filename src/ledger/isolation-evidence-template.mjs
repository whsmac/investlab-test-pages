import {ISOLATION_CASES,assessIsolationEvidence} from './isolation-evidence-review.mjs';
const expected=new Map(ISOLATION_CASES.map(c=>[c.id,c.expected]));
export function buildIsolationEvidenceTemplate(){
 return {format:'INVESTLAB_TEST_ISOLATION_EVIDENCE_V1',scope:'TEST_ONLY',projectId:'gopofxyezhwpfxbecrxd',
 cases:ISOLATION_CASES.map(c=>({id:c.id,expected:c.expected,observed:null,method:null,evidenceReference:null,notes:''})),
 serverVerified:false,authorization:'NONE'};
}
export function reviewIsolationEvidenceTemplate(data){
 if(!data||data.format!=='INVESTLAB_TEST_ISOLATION_EVIDENCE_V1'||data.scope!=='TEST_ONLY'||data.projectId!=='gopofxyezhwpfxbecrxd'||!Array.isArray(data.cases)||data.cases.length!==expected.size)throw Error('invalid TEST evidence template');
 const seen=new Set(),observations={};const issues=[];
 for(const c of data.cases){
  if(!c||!expected.has(c.id)||seen.has(c.id))throw Error('duplicate or unknown case');
  seen.add(c.id);
  if(c.expected!==expected.get(c.id))throw Error('expected observation modified');
  if(c.observed!==null&&c.observed!=='ALLOW'&&c.observed!=='DENY')throw Error('invalid observed value');
  if(c.observed!==null&&(!['SQL_EDITOR','CLIENT_SESSION','LOG_REVIEW'].includes(c.method)||typeof c.evidenceReference!=='string'||!c.evidenceReference.trim()))issues.push(c.id+': missing method/evidence reference');
  observations[c.id]=c.observed;
 }
 const result=assessIsolationEvidence(observations);
 return {status:result.status,issues,failures:result.failures,missing:result.missing,serverVerified:false,canMigrate:false,authorization:'NONE',warning:'References and observations are user-provided, not cryptographically verified. Separate TEST server execution and approval required.'};
}
