const FORMAT='INVESTLAB_SIMULATOR_SCENARIO_BACKUP';
const unsafe=new Set(['__proto__','prototype','constructor']);
export function validateScenarioBackup(saved){
 if(!saved||saved.format!==FORMAT||saved.version!==1||!saved.scenarios||typeof saved.scenarios!=='object'||Array.isArray(saved.scenarios))throw Error('지원하지 않는 전략 백업 파일');
 const names=Object.keys(saved.scenarios);
 if(names.length>30)throw Error('전략 백업은 최대 30개');
 for(const name of names){
  if(!name.trim()||name.length>80||unsafe.has(name))throw Error('안전하지 않은 전략 이름');
  const strategies=saved.scenarios[name];
  if(!Array.isArray(strategies)||!strategies.length||strategies.length>30)throw Error('전략 목록 형식 오류');
  for(const strategy of strategies){
   if(!strategy||typeof strategy.name!=='string'||!strategy.name.trim()||strategy.name.length>80||!Array.isArray(strategy.trades)||strategy.trades.length>100)throw Error('전략 내용 오류');
   for(const t of strategy.trades)if(!t||!['buy','sell'].includes(t.side)||typeof t.ticker!=='string'||!/^[A-Z0-9.^_-]{1,20}$/.test(t.ticker)||!Number.isFinite(t.quantity)||t.quantity<=0||!Number.isFinite(t.price)||t.price<=0||!Number.isFinite(t.fee??0)||(t.fee??0)<0)throw Error('거래 내용 오류');
  }
 }
 return saved.scenarios;
}
export function makeScenarioBackup(scenarios,createdAt){
 const result={format:FORMAT,version:1,createdAt,scenarios};
 validateScenarioBackup(result);
 return result;
}
export function mergeScenarioBackup(current,incoming,{overwrite=false}={}){
 const result=Object.create(null);
 for(const [name,value] of Object.entries(current))Object.defineProperty(result,name,{value,enumerable:true});
 for(const [name,value] of Object.entries(incoming)){
  if(Object.hasOwn(result,name)&&!overwrite)throw Error('같은 이름의 저장 전략이 있습니다: '+name);
  Object.defineProperty(result,name,{value,enumerable:true,configurable:true,writable:true});
 }
 validateScenarioBackup({format:FORMAT,version:1,scenarios:result});
 return result;
}
