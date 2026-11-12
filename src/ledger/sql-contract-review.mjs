// Review-only contract guard for proposed TEST SQL artifacts. Never executes SQL.
export const REQUIRED_PERSONAL_TABLES=Object.freeze(['investlab_accounts','investlab_ledger_events','investlab_ledger_legs','investlab_personal_symbols','investlab_personal_scenarios_v2']);
export const REQUIRED_TRADE_RPC='investlab_post_trade_v1';
export function assessSqlContract({migrationSql,auditSql}){
 if(typeof migrationSql!=='string'||typeof auditSql!=='string')throw Error('SQL source text required');
 const createdTables=[...migrationSql.matchAll(/\bcreate\s+table\s+public\.([a-z][a-z0-9_]*)\s*\(/gi)].map(m=>m[1]);
 const createdRpcs=[...migrationSql.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+public\.([a-z][a-z0-9_]*)\s*\(/gi)].map(m=>m[1]);
 const missingTables=REQUIRED_PERSONAL_TABLES.filter(n=>!createdTables.includes(n));
 const auditMissingTables=REQUIRED_PERSONAL_TABLES.filter(n=>!auditSql.includes("'"+n+"'"));
 const rpcMismatch=!createdRpcs.includes(REQUIRED_TRADE_RPC)||!auditSql.includes("'"+REQUIRED_TRADE_RPC+"'")||auditSql.includes("'investlab_post_trade_v0'");
 const issues=[...missingTables.map(n=>'MIGRATION_MISSING_TABLE: '+n),...auditMissingTables.map(n=>'AUDIT_MISSING_TABLE: '+n),...(rpcMismatch?['RPC_VERSION_MISMATCH: expected '+REQUIRED_TRADE_RPC]:[])];
 return {status:issues.length?'BLOCKED':'STATIC_CONTRACT_ALIGNED_NOT_DEPLOYABLE',issues,createdTables,createdRpcs,canExecuteSql:false,canMigrate:false,authorization:'NONE',warning:'Text matching cannot prove SQL correctness, rollback, RLS isolation, or deployment safety.'};
}
