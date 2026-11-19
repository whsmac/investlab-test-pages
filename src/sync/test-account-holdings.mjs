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

export function summarizeTestAllAccounts(accountBreakdown){
 if(!accountBreakdown||!Array.isArray(accountBreakdown.accounts))throw Error('계좌별 보유현황이 필요합니다');
 const combined=new Map();
 for(const account of accountBreakdown.accounts){
  if(!Array.isArray(account.holdings))throw Error('계좌별 종목 정보 오류');
  if(account.accountId==null)continue; // Never blend unassigned trades into identified account totals.
  for(const holding of account.holdings){
   const key=String(holding.currency||'USD')+'|'+String(holding.symbol||'');
   const entry=combined.get(key)||{symbol:holding.symbol,currency:holding.currency||'USD',quantity:0,weightedCost:0,accountCount:0,reviewRequired:false,unassignedIncluded:false};
   const quantity=Number(holding.quantity);
   if(!Number.isFinite(quantity)||quantity<0||holding.reviewRequired||((quantity>0)&&(!Number.isFinite(Number(holding.averageCost))||holding.averageCost==null))){
    entry.reviewRequired=true;
   }else{
    entry.quantity+=quantity;
    if(quantity>0)entry.weightedCost+=quantity*Number(holding.averageCost);
   }
   if(quantity!==0)entry.accountCount++;
   if(account.accountId==null&&quantity!==0)entry.unassignedIncluded=true;
   combined.set(key,entry);
  }
 }
 const holdings=[...combined.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.currency.localeCompare(b.currency)).map(entry=>({
  symbol:entry.symbol,currency:entry.currency,quantity:entry.reviewRequired?null:entry.quantity,
  averageCost:entry.reviewRequired||entry.quantity<=0?null:entry.weightedCost/entry.quantity,
  accountCount:entry.accountCount,reviewRequired:entry.reviewRequired,
  unassignedIncluded:entry.unassignedIncluded,
  cashBalance:null
 }));
 return {holdings,unassignedTransactions:accountBreakdown.unassignedTransactions??0,cashVerified:false,canWrite:false};
}
