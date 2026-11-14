// Pure, offline review of proposed v2 schema. No SQL execution.
export const LEDGER_V2_TABLES=Object.freeze(['investlab_accounts','investlab_ledger_events','investlab_ledger_legs','investlab_personal_symbols','investlab_personal_scenarios_v2']);
export function assessLedgerV2Schema(sql){
 if(typeof sql!=='string')throw Error('SQL text required');
 const checks=[
  ['five_tables',LEDGER_V2_TABLES.every(t=>new RegExp('create\\s+table\\s+public\\.'+t+'\\s*\\(','i').test(sql))],
  ['account_idempotency',/unique\s*\(user_id,request_id\)/i.test(sql)],
  ['event_idempotency',/unique\s*\(user_id,account_id,request_id\)/i.test(sql)],
  ['opening_event',/event_type\s+text[^\n]*'opening'/i.test(sql)],
  ['multi_leg',/unique\s*\(event_id,asset_type,asset_code\)/i.test(sql)],
  ['opening_cost',/opening_cost_basis_usd\s+numeric/i.test(sql)],
  ['cash_vs_security',/asset_type='cash' and asset_code in \('USD','KRW'\)/i.test(sql)],
  ['all_force_rls',LEDGER_V2_TABLES.every(t=>sql.includes('alter table public.'+t+' force row level security;'))],
  ['read_only_grants',/grant select on public\.investlab_accounts/i.test(sql)&&!/grant\s+(?:all|insert|update|delete)\s+on public\.investlab_accounts/i.test(sql)],
  ['no_executable_rpc',!/\bcreate\s+(?:or\s+replace\s+)?function\b/i.test(sql)]
 ];
 const blockers=checks.filter(([,ok])=>!ok).map(([id])=>id);
 return {status:blockers.length?'STATIC_CONTRACT_BLOCKED':'STATIC_CONTRACT_REVIEW_ONLY',checks:checks.map(([id,passed])=>({id,passed})),blockers,serverVerified:false,canExecuteSql:false,canMigrate:false,authorization:'NONE'};
}
