#!/usr/bin/env node
// Read-only candidate quote audit. No Supabase access, writes or secrets.
// Stooq daily CSV is a secondary source: its price adjustment convention must
// be verified before any value is promoted to portfolio valuation.
const symbols=(process.argv.slice(2).length?process.argv.slice(2):['TSLA','MSFT','GOOGL','AMZN','META'])
  .map(x=>x.trim().toUpperCase());
const rows=[];
for(const symbol of symbols){
 if(!/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)){rows.push({symbol,error:'invalid ticker'});continue;}
 const url='https://stooq.com/q/d/l/?s='+encodeURIComponent(symbol.toLowerCase()+'.us')+'&i=d';
 try{
  const response=await fetch(url,{headers:{'User-Agent':'INVESTLAB-readonly-price-audit/1.0'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const csv=(await response.text()).trim().split(/\r?\n/);
  if(csv[0]?.replace(/^\uFEFF/,'')!=='Date,Open,High,Low,Close,Volume')throw Error('unexpected CSV header');
  const valid=csv.slice(1).map(line=>{
   const fields=line.split(',');
   return {date:fields[0],close:Number(fields[4])};
  }).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(x.close)&&x.close>0);
  const last=valid.at(-1);
  if(!last)throw Error('no valid daily observations');
  const ageDays=(Date.now()-Date.parse(last.date+'T00:00:00Z'))/86400000;
  rows.push({symbol,date:last.date,close:last.close,ageDays:Math.floor(ageDays),source:'Stooq CSV',price_basis:'UNVERIFIED_ADJUSTMENT',eligible_for_valuation:false});
 }catch(error){rows.push({symbol,error:String(error.message||error),eligible_for_valuation:false});}
}
process.stdout.write(JSON.stringify({purpose:'candidate price audit only',supabase_write:false,generated_at:new Date().toISOString(),rows},null,2)+'\n');
if(rows.some(x=>x.error))process.exitCode=1;
