// Parse pasted read-only SQL audit output; no database connection.
export const PERSONAL_TABLES=['investlab_accounts','investlab_ledger_events','investlab_ledger_legs','investlab_personal_symbols','investlab_personal_scenarios_v2'];
export function assessLedgerSecurityAudit(tables,functions=[]){
 if(!Array.isArray(tables)||!Array.isArray(functions))throw Error('audit results must be arrays');
 const byName=new Map();for(const row of tables){if(!row||typeof row.table_name!=='string'||byName.has(row.table_name))throw Error('duplicate or malformed table audit');byName.set(row.table_name,row)}
 const checks=PERSONAL_TABLES.map(name=>{const r=byName.get(name);
  if(!r||r.exists!==true)return {name,status:'MISSING',issues:['table absent or not verified']};
  const issues=[];
  if(r.rls_enabled!==true)issues.push('RLS disabled or unknown');
  if(r.anon_select!==false)issues.push('anonymous SELECT not proven blocked');
  if(r.auth_delete===true)issues.push('authenticated DELETE granted');
  if(r.auth_update===true)issues.push('authenticated UPDATE granted');
  if(r.auth_insert===true)issues.push('authenticated INSERT granted (review RPC-only design)');
  if(typeof r.policy_count!=='number'||r.policy_count<1)issues.push('policies absent or unverified');
  return {name,status:issues.length?'REVIEW_REQUIRED':'CATALOG_CHECK_PASSED',issues};
 });
 const rpc=functions.filter(f=>f.function_name==='investlab_post_trade_v0');
 const rpcIssues=[];
 if(rpc.length!==1)rpcIssues.push('RPC missing, duplicate, or not verified');
 else {const f=rpc[0];if(f.security_definer!==true)rpcIssues.push('security definer setting not verified');if(f.anon_execute!==false)rpcIssues.push('anonymous EXECUTE not proven blocked');if(f.authenticated_execute!==true)rpcIssues.push('authenticated EXECUTE not granted');}
 return {status:'SERVER_ISOLATION_TESTS_STILL_REQUIRED',checks,rpcIssues,
  missingTables:checks.filter(c=>c.status==='MISSING').map(c=>c.name),
  catalogIssues:checks.flatMap(c=>c.issues.map(issue=>({table:c.name,issue}))),
  noDatabaseWrites:true,canMigrate:false,
  warnings:['Catalog privileges do not prove per-user RLS isolation. Test with A/B/anonymous users before approval.','Never paste access tokens, passwords or service-role keys.']};
}
