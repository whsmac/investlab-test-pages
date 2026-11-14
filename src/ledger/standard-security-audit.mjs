import {assessLedgerSecurityAudit} from './ledger-security-audit-review.mjs';
export function parseStandardSecurityAudit(value){
 let obj=value;
 if(typeof obj==='string'){if(new TextEncoder().encode(obj).length>1024*1024)throw Error('audit JSON exceeds 1MiB');try{obj=JSON.parse(obj)}catch{throw Error('invalid audit JSON')}}
 // Accept SQL editor row exports as well as the audit_json object.
 if(Array.isArray(obj)&&obj.length===1)obj=obj[0];
 if(obj&&typeof obj.audit_json==='string')obj=JSON.parse(obj.audit_json);
 else if(obj&&obj.audit_json&&typeof obj.audit_json==='object')obj=obj.audit_json;
 if(!obj||obj.format!=='INVESTLAB_LEDGER_SECURITY_AUDIT_V1'||obj.version!==1||obj.scope!=='TEST_READ_ONLY_CATALOG')throw Error('unsupported audit format');
 if(!Array.isArray(obj.tables)||!Array.isArray(obj.functions))throw Error('audit arrays missing');
 return {audit:obj,assessment:assessLedgerSecurityAudit(obj.tables,obj.functions)};
}
