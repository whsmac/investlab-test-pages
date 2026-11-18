// TEST-only account selector options from authenticated ledger rows.
// This does not create accounts or infer missing account identities.
const KEYS=['account_id','portfolio_account_id','brokerage_account_id'];
export function listTestLedgerAccounts(rows){
 if(!Array.isArray(rows))throw Error('원장 배열 필요');
 const accounts=new Map();let unassigned=0,conflicting=0;
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row)){conflicting++;continue;}
  const ids=KEYS.filter(k=>row[k]!=null&&String(row[k]).trim()).map(k=>String(row[k]).trim());
  if(!ids.length){unassigned++;continue;}
  if(new Set(ids).size!==1){conflicting++;continue;}
  const id=ids[0];accounts.set(id,(accounts.get(id)||0)+1);
 }
 return {accounts:[...accounts].sort((a,b)=>a[0].localeCompare(b[0])).map(([id,transactions])=>({id,transactions})),
  unassigned,conflicting,canWrite:false,source:'TEST_LEDGER_READ_ONLY'};
}
