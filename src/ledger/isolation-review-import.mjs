import {ISOLATION_CASES,assessIsolationEvidence} from './isolation-evidence-review.mjs';
const allowed=new Map(ISOLATION_CASES.map(c=>[c.id,c]));
export function parseIsolationReviewFile(value){
 let obj=value;
 if(typeof obj==='string'){if(new TextEncoder().encode(obj).length>1024*1024)throw Error('isolation JSON exceeds 1MiB');try{obj=JSON.parse(obj)}catch{throw Error('invalid isolation JSON')}}
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||obj.format!=='INVESTLAB_TEST_ISOLATION_REVIEW_V1'||!Array.isArray(obj.cases))throw Error('unsupported isolation review format');
 if(obj.cases.length!==ISOLATION_CASES.length)throw Error('isolation case count mismatch');
 const evidence={},seen=new Set();
 for(const c of obj.cases){
  if(!c||typeof c.id!=='string'||!allowed.has(c.id))throw Error('unknown isolation case');
  if(seen.has(c.id))throw Error('duplicate isolation case');
  seen.add(c.id);
  if(c.expected!==allowed.get(c.id).expected)throw Error('expected result was modified');
  if(c.actual!==null&&c.actual!=='ALLOW'&&c.actual!=='DENY')throw Error('invalid actual observation');
  evidence[c.id]=c.actual;
 }
 const assessment=assessIsolationEvidence(evidence);
 // Imported status, PASS, or serverVerified fields are never trusted.
 return {evidence,assessment,source:'MANUAL_FILE_UNTRUSTED',serverVerified:false,canMigrate:false};
}
