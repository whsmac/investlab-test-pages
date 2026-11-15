// Read-only price comparison for a reviewed, explicitly selected bulk import.
export function compareBulkAssumedPrices({tickers,assumedPrices,existingPrices}){
 if(!Array.isArray(tickers)||!assumedPrices||typeof assumedPrices!=='object'||!Array.isArray(existingPrices))throw Error('invalid comparison input');
 const existing=new Map(existingPrices.filter(p=>p&&typeof p.ticker==='string').map(p=>[p.ticker.trim().toUpperCase(),Number(p.price)]));
 return tickers.map(ticker=>{
  const name=String(ticker).trim().toUpperCase();
  const incoming=Object.prototype.hasOwnProperty.call(assumedPrices,name)?Number(assumedPrices[name]):null;
  const previous=existing.has(name)?existing.get(name):null;
  const valid=value=>value!==null&&Number.isFinite(value)&&value>=0;
  const status=!valid(incoming)?'NOT_PROVIDED':!valid(previous)?'NEW':incoming===previous?'UNCHANGED':'CHANGED';
  return {ticker:name,previous:valid(previous)?previous:null,incoming:valid(incoming)?incoming:null,difference:status==='CHANGED'?incoming-previous:null,status};
 });
}
