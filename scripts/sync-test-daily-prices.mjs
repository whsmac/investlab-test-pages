#!/usr/bin/env node
// Server-side TEST-only daily quote importer. Never run in a browser.
// Required: INVESTLAB_TEST_SUPABASE_URL, INVESTLAB_TEST_SUPABASE_SERVICE_KEY,
// INVESTLAB_ENABLE_TEST_PRICE_WRITES=yes. No production target accepted.
const TEST_URL='https://gopofxyezhwpfxbecrxd.supabase.co';
const url=process.env.INVESTLAB_TEST_SUPABASE_URL;
const key=process.env.INVESTLAB_TEST_SUPABASE_SERVICE_KEY;
const write=process.env.INVESTLAB_ENABLE_TEST_PRICE_WRITES==='yes';
if(url!==TEST_URL)throw Error('TEST Supabase URL mismatch; production is prohibited');
if(!key)throw Error('Missing TEST-only backend secret');
const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
const api=async(path,init={})=>{
 const response=await fetch(TEST_URL+'/rest/v1/'+path,{...init,headers:{...headers,...init.headers},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Supabase HTTP '+response.status+': '+(await response.text()).slice(0,300));
 const body=await response.text();return body?JSON.parse(body):null;
};
const companies=await api('companies?select=id,ticker&ticker=in.(TSLA,MSFT,GOOGL,AMZN,META)');
if(!companies?.length)throw Error('No matching companies in TEST');
let successes=0,errors=0;
for(const company of companies){
 const ticker=String(company.ticker).toUpperCase();
 try{
  const endpoint='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(ticker)+'?range=10d&interval=1d';
  const response=await fetch(endpoint,{headers:{'User-Agent':'Mozilla/5.0 INVESTLAB/1.0'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('price provider HTTP '+response.status);
  const json=await response.json(),result=json.chart?.result?.[0];
  const stamps=result?.timestamp||[],closes=result?.indicators?.quote?.[0]?.close||[];
  const zone=result?.meta?.exchangeTimezoneName||'America/New_York';
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
  const observations=stamps.map((ts,i)=>({trading_date:formatter.format(new Date(ts*1000)),close_price:closes[i]}))
   .filter(x=>Number.isFinite(x.close_price)&&x.close_price>0);
  const latest=observations.at(-1);
  if(!latest)throw Error('no valid close price');
  const ageDays=(Date.now()-Date.parse(latest.trading_date+'T00:00:00Z'))/86400000;
  if(ageDays>7||ageDays< -1)throw Error('stale or future observation: '+latest.trading_date);
  const row={company_id:company.id,trading_date:latest.trading_date,close_price:latest.close_price,currency:'USD',price_basis:'raw'};
  const query='market_price_observations?select=id,close_price&company_id=eq.'+encodeURIComponent(company.id)+'&trading_date=eq.'+latest.trading_date+'&currency=eq.USD&price_basis=eq.raw&limit=1';
  const existing=await api(query);
  if(!write){console.log('DRY RUN',ticker,row.trading_date,row.close_price,'existing',existing?.length||0);successes++;continue;}
  if(existing?.length){
   await api('market_price_observations?id=eq.'+encodeURIComponent(existing[0].id),{method:'PATCH',body:JSON.stringify({close_price:row.close_price}),headers:{Prefer:'return=minimal'}});
  }else{
   await api('market_price_observations',{method:'POST',body:JSON.stringify(row),headers:{Prefer:'return=minimal'}});
  }
  console.log('TEST UPDATED',ticker,row.trading_date,row.close_price);successes++;
 }catch(error){errors++;console.error('FAILED',ticker,String(error.message||error));}
}
console.log(JSON.stringify({mode:write?'TEST WRITE':'DRY RUN',successes,errors}));
if(errors||!successes)process.exitCode=1;
