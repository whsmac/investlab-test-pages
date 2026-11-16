// TEST-only moving-average acquisition cost. Not a tax basis or live portfolio valuation.
export function calculateTestAverageCosts(rows){
 if(!Array.isArray(rows))throw Error('원장 배열 필요');
 const sorted=rows.filter(r=>r&&['BUY','SELL','OPENING_POSITION'].includes(r.transaction_type)).map((r,i)=>({...r,_order:i})).sort((a,b)=>String(a.transaction_date||'').localeCompare(String(b.transaction_date||''))||Number(a.sequence_no||0)-Number(b.sequence_no||0)||a._order-b._order);
 const map=new Map();
 for(const row of sorted){
  const key=String(row.currency||'USD')+'|'+String(row.symbol||''),q=Number(row.quantity),price=Number(row.unit_price);
  if(!row.symbol||row.quantity==null||row.unit_price==null||!Number.isFinite(q)||q<=0||!Number.isFinite(price)||price<0){const entry=map.get(key)||{symbol:row.symbol||'',currency:row.currency||'USD',quantity:0,totalCost:0,trades:0,reviewRequired:false};entry.reviewRequired=true;map.set(key,entry);continue;}
  const entry=map.get(key)||{symbol:row.symbol,currency:row.currency||'USD',quantity:0,totalCost:0,trades:0,reviewRequired:false};entry.trades++;
  if(row.transaction_type==='SELL'){
   if(q>entry.quantity+1e-9){entry.reviewRequired=true;entry.quantity-=q;entry.totalCost=0;}
   else{const avg=entry.quantity?entry.totalCost/entry.quantity:0;entry.quantity-=q;entry.totalCost=entry.quantity<=1e-9?0:entry.totalCost-avg*q;}
  }else{if(entry.quantity<0)entry.reviewRequired=true;entry.quantity+=q;entry.totalCost+=q*price;}
  map.set(key,entry);
 }
 return [...map.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)).map(e=>({symbol:e.symbol,currency:e.currency,quantity:e.quantity,trades:e.trades,averageCost:!e.reviewRequired&&e.quantity>0?e.totalCost/e.quantity:null,reviewRequired:e.reviewRequired}));
}
