// Canonical opening request payload, browser/Node compatible. Offline only.
const SYMBOL=/^[A-Z0-9][A-Z0-9.^_-]{0,19}$/;
const DEC=/^(0|[1-9][0-9]*)(?:\.([0-9]{1,8}))?$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function normalized(value,label,positive=false){
 if(typeof value!=='string'||!DEC.test(value))throw Error('invalid '+label);
 const [whole,fraction='']=value.split('.');
 const scaled=BigInt(whole)*100000000n+BigInt(fraction.padEnd(8,'0'));
 if((positive&&scaled===0n)||scaled>=10n**26n)throw Error('invalid '+label+' range');
 return (scaled/100000000n).toString()+'.'+(scaled%100000000n).toString().padStart(8,'0');
}
export function canonicalOpeningPayload({accountId,requestId,rows}){
 if(typeof accountId!=='string'||!UUID.test(accountId))throw Error('invalid account ID');
 if(typeof requestId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(requestId))throw Error('invalid request ID');
 if(!Array.isArray(rows)||rows.length<1||rows.length>200)throw Error('invalid opening rows');
 const seen=new Set();
 const normalizedRows=rows.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('invalid opening row');
  const keys=Object.keys(row);
  if(keys.some(k=>!['assetType','assetCode','delta','openingCostBasisUsd'].includes(k)))throw Error('unknown opening field');
  const {assetType,assetCode}=row;
  if(!['cash','security'].includes(assetType)||typeof assetCode!=='string'||!SYMBOL.test(assetCode))throw Error('invalid opening asset');
  if(assetType==='cash'&&!['USD','KRW'].includes(assetCode))throw Error('invalid cash currency');
  if(assetType==='security'&&['USD-CASH','KRW','USD'].includes(assetCode))throw Error('reserved security code');
  const key=assetType+':'+assetCode;
  if(seen.has(key))throw Error('duplicate opening asset');
  seen.add(key);
  const delta=normalized(row.delta,'opening quantity',true);
  if(assetType==='cash'){
   if('openingCostBasisUsd' in row)throw Error('cash cost basis forbidden');
   return {assetType,assetCode,delta};
  }
  return {assetType,assetCode,delta,openingCostBasisUsd:normalized(row.openingCostBasisUsd,'cost basis')};
 }).sort((a,b)=>(a.assetType+':'+a.assetCode).localeCompare(b.assetType+':'+b.assetCode,'en'));
 return JSON.stringify({version:1,eventType:'opening',accountId:accountId.toLowerCase(),requestId,rows:normalizedRows});
}
export async function openingPayloadSha256(request){
 const canonical=canonicalOpeningPayload(request);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
