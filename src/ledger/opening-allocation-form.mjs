// Pure offline table form mapping; never guesses account ownership or cost.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEC=/^(0|[1-9]\d*)(?:\.\d{1,8})?$/;
const SYMBOL=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
export function buildAllocationFormInputs({accounts,holdings,positionRows,cashRows}={}){
 if(!Array.isArray(accounts)||!Array.isArray(holdings)||!Array.isArray(positionRows)||!Array.isArray(cashRows))throw Error('table arrays required');
 const ids=new Set();
 const normalizedAccounts=accounts.map(a=>{if(!a||!UUID.test(a.id)||typeof a.name!=='string'||!a.name.trim())throw Error('invalid account');const id=a.id.toLowerCase();if(ids.has(id))throw Error('duplicate account');ids.add(id);return {id,name:a.name.trim(),ownerConfirmed:a.ownerConfirmed===true}});
 const tickers=new Set(holdings.map(h=>h.symbol));
 const seen=new Set();
 const allocations=[],costConfirmations=[];
 for(const row of positionRows){
  if(!row||!ids.has(row.accountId?.toLowerCase())||!tickers.has(row.ticker)||!SYMBOL.test(row.ticker)||!DEC.test(row.quantity)||row.quantity==='0'||!DEC.test(row.averageCostUsd))throw Error('invalid position form row');
  const id=row.accountId.toLowerCase(),key=id+'|'+row.ticker;if(seen.has(key))throw Error('duplicate position row');seen.add(key);
  allocations.push({accountId:id,ticker:row.ticker,quantity:row.quantity});
  if(row.costConfirmed===true)costConfirmations.push({accountId:id,ticker:row.ticker,confirmedAverageCostUsd:row.averageCostUsd,ownerVerified:true});
 }
 const cash=[],cashSeen=new Set();
 for(const row of cashRows){
  if(!row||!ids.has(row.accountId?.toLowerCase())||!['USD','KRW'].includes(row.currency)||!DEC.test(row.balance))throw Error('invalid cash form row');
  const id=row.accountId.toLowerCase(),key=id+'|'+row.currency;if(cashSeen.has(key))throw Error('duplicate cash row');cashSeen.add(key);
  cash.push({accountId:id,currency:row.currency,balance:row.balance});
 }
 return {accounts:normalizedAccounts,allocations,cash,costConfirmations};
}
