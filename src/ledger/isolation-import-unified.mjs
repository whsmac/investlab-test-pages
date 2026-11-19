import {parseIsolationReviewFile} from './isolation-review-import.mjs';
import {parseIsolationEvidenceDocument} from './isolation-evidence-assessment.mjs';
import {ISOLATION_CASES} from './isolation-evidence-review.mjs';
export function normalizeIsolationReviewImport(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>1024*1024)throw Error('invalid file size');
 let obj;try{obj=JSON.parse(text)}catch{throw Error('invalid JSON')};
 if(obj?.format==='INVESTLAB_TEST_ISOLATION_REVIEW_V1'){
  const parsed=parseIsolationReviewFile(obj);
  return {sourceFormat:obj.format,evidence:parsed.evidence,issues:[],status:parsed.assessment.status,serverVerified:false,canMigrate:false};
 }
 if(obj?.format==='INVESTLAB_TEST_ISOLATION_EVIDENCE_V1'){
  const parsed=parseIsolationEvidenceDocument(obj);
  const evidence=Object.fromEntries(parsed.cases.map(c=>[c.id,c.status==='MANUAL_MATCH'||c.status==='FAILED'?c.observed:null]));
  const issues=parsed.cases.filter(c=>c.status==='EVIDENCE_MISSING').map(c=>c.id+': evidence reference required');
  return {sourceFormat:obj.format,evidence,issues,status:parsed.status,serverVerified:false,canMigrate:false};
 }
 throw Error('unsupported isolation file format');
}
