// Shared projection for INVESTLAB local-first Pilot ledger (no database writes).
export function projectLedger(data, accountId='ALL') {
 const accounts=Array.isArray(data?.accounts)?data.accounts:[];
 const valid=new Set(accounts.map(a=>a.id));
 const entries=(Array.isArray(data?.entries)?data.entries:[])
  .filter(e=>valid.has(e.accountId)&&(accountId==='ALL'||e.accountId===accountId))
  .sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.created||0)-Number(b.created||0));
 const positions=new Map(),cash={USD:0,KRW:0},realizedBySymbol=new Map();
 let realizedUsd=0,sellCount=0;
 for(const e of entries){
  const currency=e.currency==='KRW'?'KRW':'USD',qty=Number(e.qty)||0,price=Number(e.price)||0,amount=Number(e.amount)||0;
  if(['OPEN','BUY','SELL'].includes(e.type)){
   const key=e.accountId+'|'+e.symbol,p=positions.get(key)||{symbol:e.symbol,qty:0,cost:0};
   if(e.type==='SELL'){const avg=p.qty>0?p.cost/p.qty:0;const gain=qty*(price-avg);realizedUsd+=gain;sellCount++;const prior=realizedBySymbol.get(e.symbol)||{symbol:e.symbol,realizedUsd:0,sellCount:0,proceedsUsd:0,disposedCostUsd:0};prior.realizedUsd+=gain;prior.sellCount++;prior.proceedsUsd+=qty*price;prior.disposedCostUsd+=qty*avg;realizedBySymbol.set(e.symbol,prior);p.qty-=qty;p.cost-=qty*avg;cash[currency]+=qty*price;}
   else{p.qty+=qty;p.cost+=qty*price;if(e.type==='BUY')cash[currency]-=qty*price;}
   if(Math.abs(p.qty)<1e-9){p.qty=0;p.cost=0;}
   positions.set(key,p);
  }else if(e.type==='DEPOSIT'||e.type==='DIVIDEND')cash[currency]+=amount;
  else if(e.type==='WITHDRAW')cash[currency]-=amount;
  else if(e.type==='FX'){cash[currency]-=amount;if(e.toCurrency==='USD'||e.toCurrency==='KRW')cash[e.toCurrency]+=Number(e.toAmount)||0;}
 }
 const grouped=new Map();
 for(const p of positions.values()){if(p.qty<=1e-9)continue;const g=grouped.get(p.symbol)||{symbol:p.symbol,qty:0,cost:0};g.qty+=p.qty;g.cost+=p.cost;grouped.set(p.symbol,g);}
 const holdings=[...grouped.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)).map(p=>({...p,averageCost:p.cost/p.qty}));
 return {holdings,cash,cost:holdings.reduce((s,p)=>s+p.cost,0),realizedUsd,sellCount,realizedBySymbol:[...realizedBySymbol.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol))};
}
