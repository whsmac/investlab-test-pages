// TEST ledger holdings derived from authenticated online rows. No market valuation or local portfolio merge.
export function summarizeTestLedgerHoldings(rows){
 if(!Array.isArray(rows))throw Error('원장 거래 목록이 필요합니다');
 const map=new Map();let skipped=0;
 for(const row of rows){
  if(!row||typeof row!=='object'){skipped++;continue;}
  if(!['BUY','SELL','OPENING_POSITION'].includes(row.transaction_type))continue;
  const symbol=row.symbol,quantity=Number(row.quantity);
  if(typeof symbol!=='string'||!symbol||row.quantity==null||!Number.isFinite(quantity)||quantity<=0){skipped++;continue;}
  const key=String(row.currency||'USD')+'|'+symbol;
  const previous=map.get(key)||{symbol,currency:row.currency||'USD',quantity:0,trades:0};
  previous.quantity+=row.transaction_type==='SELL'?-quantity:quantity;previous.trades++;
  map.set(key,previous);
 }
 return {holdings:[...map.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)),skipped,mode:'TEST_LEDGER_ONLY',includesMarketValue:false,includesLocalPortfolio:false};
}
