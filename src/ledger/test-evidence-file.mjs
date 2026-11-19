import {summarizeTestEvidence} from './test-evidence-summary.mjs';
import {validateBrowserSmokeReport} from './browser-smoke-compare.mjs';
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v}
export function buildTestEvidenceFile({manualReport,ci,createdAt}={}){
 const manual=validateBrowserSmokeReport(manualReport);
 if(typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt)))throw Error('invalid evidence timestamp');
 if(!ci||typeof ci!=='object'||!['success','failure','unverified'].includes(ci.status)||typeof ci.reference!=='string'||ci.reference.length>200)throw Error('invalid CI evidence input');
 const summary=summarizeTestEvidence({manualReport:manual,ci});
 return {format:'INVESTLAB_TEST_COMBINED_EVIDENCE',version:1,createdAt,inputs:{manualReport:manual,ci:{status:ci.status,reference:ci.reference}},summary,serverVerified:false,canPost:false,canMigrate:false,authorization:'NONE'};
}
export function validateTestEvidenceFile(saved){
 if(!saved||saved.format!=='INVESTLAB_TEST_COMBINED_EVIDENCE'||saved.version!==1||saved.serverVerified!==false||saved.canPost!==false||saved.canMigrate!==false||saved.authorization!=='NONE')throw Error('unsafe or unsupported evidence file');
 const rebuilt=buildTestEvidenceFile({...saved.inputs,createdAt:saved.createdAt});
 if(JSON.stringify(canonical(saved))!==JSON.stringify(canonical(rebuilt)))throw Error('evidence file inconsistent with inputs');
 return rebuilt;
}
