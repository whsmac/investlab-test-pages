// TEST-only account breakdown from owner-scoped ledger rows.
// Unknown account IDs are kept separate, never assigned to a real account.
import {calculateTestAverageCosts} from './test-online-average-cost.mjs';
const accountFields=['account_id','portfolio_account_id','brokerage_account_id'];
export function buildTestAccountHoldings(rows){
 if(!Array.isArray(rows))throw Error('원장 배열 필요');
 const grouped=new Map();
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('원장 행 형식 오류');
  const fields=accountFields.filter(k=>row[k]!=null&&String(row[k]).trim()!=='');
  if(fields.length>1&&new Set(fields.map(k=>String(row[k]).trim())).size>1)throw Error('한 거래에 서로 다른 계좌 식별자가 있습니다');
  const accountId=fields.length?String(row[fields[0]]).trim():null;
  const key=accountId===null?'unknown':'account:'+accountId;
  if(!grouped.has(key))grouped.set(key,{accountId,rows:[]});
  grouped.get(key).rows.push(row);
 }
 const accounts=[...grouped.values()].map(group=>({
  accountId:group.accountId,accountLabel:group.accountId??'계좌 미지정',
  transactionCount:group.rows.length,
  holdings:calculateTestAverageCosts(group.rows).filter(x=>x.quantity!==0||x.reviewRequired),
  cashBalance:null,cashVerified:false
 }));
 accounts.sort((a,b)=>a.accountId===null?1:b.accountId===null?-1:a.accountId.localeCompare(b.accountId));
 return {accounts,unassignedTransactions:accounts.find(x=>x.accountId===null)?.transactionCount??0,
  accountCount:accounts.filter(x=>x.accountId!==null).length,cashVerified:false,canSync:false,canWrite:false};
}
