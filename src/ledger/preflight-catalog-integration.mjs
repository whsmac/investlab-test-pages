import {assessTestMigrationPreflight} from './test-migration-preflight.mjs';
import {parseStandardSecurityAudit} from './standard-security-audit.mjs';
// SQL catalog evidence can block a preflight but can never prove user-level RLS isolation.
export function assessPreflightWithCatalog(manualEvidence={},auditInput=null){
 const base=assessTestMigrationPreflight(manualEvidence);
 if(auditInput===null||auditInput==='')return {...base,status:'BLOCKED',catalogStatus:'NOT_PROVIDED',catalogBlockers:['catalog audit not supplied'],canUpload:false,canExecuteSql:false};
 const {assessment}=parseStandardSecurityAudit(auditInput);
 const catalogBlockers=[...assessment.catalogIssues.map(x=>x.table+': '+x.issue),...assessment.rpcIssues];
 // RLS user isolation is distinct from catalog inspection. This flag is only evidence of catalog prerequisites.
 const catalogStatus=catalogBlockers.length?'REVIEW_REQUIRED':'CATALOG_PREREQUISITES_PASSED';
 return {...base,status:base.status==='READY_FOR_SEPARATE_APPROVAL'&&!catalogBlockers.length?'READY_FOR_SEPARATE_APPROVAL':'BLOCKED',
  catalogStatus,catalogBlockers,requiresABUserIsolationTest:true,
  canUpload:false,canExecuteSql:false,authorization:'NONE',
  warning:'Catalog audit does not prove user isolation; verify A/B/anon sessions independently.'};
}
