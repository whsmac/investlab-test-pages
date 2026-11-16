// Read-only shape inventory for an imported personal ledger. No database schema assumptions.
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function inspectLedgerShape(ledger){
 if(!plain(ledger))throw Error('원장 JSON은 객체여야 합니다');
 const sections=[];
 for(const [name,value] of Object.entries(ledger)){
  if(!/^[a-zA-Z0-9_가-힣-]{1,80}$/.test(name))continue;
  if(Array.isArray(value)){
   const fields=new Set();let objectRows=0,otherRows=0;
   for(const item of value){if(plain(item)){objectRows++;for(const key of Object.keys(item))if(typeof key==='string'&&key.length<=80)fields.add(key);}else otherRows++;}
   sections.push({name,type:'array',count:value.length,objectRows,otherRows,fields:[...fields].sort().slice(0,100)});
  }else sections.push({name,type:plain(value)?'object':typeof value,count:null,fields:plain(value)?Object.keys(value).sort().slice(0,100):[]});
 }
 return {sections,sourceRows:sections.reduce((n,s)=>n+(s.type==='array'?s.count:0),0),databaseColumnsVerified:false,rlsIsolationVerified:false,canPost:false,canSync:false};
}
