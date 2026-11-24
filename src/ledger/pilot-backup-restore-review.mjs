// TEST only. Read-only restore planning; never performs storage or network writes.
import {validateLedger} from './pilot-ledger-validation.mjs';
import {validateScenarioBackup} from './scenario-backup.mjs';
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(v,k)=>Object.hasOwn(v,k);
const uuid=/^[a-f0-9-]{30,50}$/i;
const unsafe=new Set(['__proto__','prototype','constructor']);
const stable=v=>JSON.stringify(v,(k,x)=>obj(x)?Object.fromEntries(Object.keys(x).sort().map(n=>[n,x[n]])):x);
export function validateBackupLedger(ledger){
 if(ledger===null)return;
 if(!obj(ledger)||ledger.version!==1||!Array.isArray(ledger.accounts)||!Array.isArray(ledger.entries)||ledger.accounts.length>100||ledger.entries.length>50000)throw Error('통합원장 형식 오류');
 for(const a of ledger.accounts)if(!obj(a)||typeof a.id!=='string'||!a.id||unsafe.has(a.id)||typeof a.name!=='string'||!a.name.trim())throw Error('계좌 정보 오류');
 for(const e of ledger.entries){
  if(!obj(e)||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date))throw Error('거래 날짜 오류');
  const d=new Date(e.date+'T00:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==e.date)throw Error('존재하지 않는 거래 날짜');
  const fields=['OPEN','BUY','SELL'].includes(e.type)?['qty','price']:e.type==='FX'?['amount','toAmount']:['amount'];
  for(const key of fields)if(!['number','string'].includes(typeof e[key])||String(e[key]).trim()===''||!Number.isFinite(Number(e[key])))throw Error('거래 숫자 오류');
  if(['OPEN','BUY','SELL'].includes(e.type)&&!Number.isFinite(Number(e.qty)*Number(e.price)))throw Error('거래 금액 범위 오류');
 }
 validateLedger(ledger);
}
export function validateBackupStrategies(map,max=30){
 if(!obj(map)||Object.keys(map).length>max)throw Error('전략 목록 형식 오류');
 for(const [name,value] of Object.entries(map))validateScenarioBackup({format:'INVESTLAB_SIMULATOR_SCENARIO_BACKUP',version:1,scenarios:Object.fromEntries([[name,value]])});
}
export function validateOnlineBackup(online){
 if(!obj(online)||online.project!=='investlab-ledger-test'||!own(online,'ledger')||!own(online,'strategies'))throw Error('온라인 백업 형식 오류');
 validateBackupLedger(online.ledger);validateBackupStrategies(online.strategies);
 return online;
}
export function planOnlineRestore({ownerId,verifiedUserId,online,currentLedger,currentStrategies}){
 if(typeof ownerId!=='string'||!uuid.test(ownerId)||ownerId!==verifiedUserId)throw Error('백업 계정과 현재 TEST 계정 불일치');
 validateOnlineBackup(online);validateBackupLedger(currentLedger);
 validateBackupStrategies(currentStrategies,100);
 const old=Object.keys(currentStrategies),incoming=Object.keys(online.strategies);
 const changes={add:0,replace:0,unchanged:0,preserve:0};
 for(const n of incoming){if(!own(currentStrategies,n))changes.add++;else if(stable(currentStrategies[n])===stable(online.strategies[n]))changes.unchanged++;else changes.replace++;}
 changes.preserve=old.filter(n=>!own(online.strategies,n)).length;
 return {status:'READ_ONLY_REVIEW',canWrite:false,atomicRestoreVerified:false,
  ledgerAction:online.ledger===null?'preserve':stable(online.ledger)===stable(currentLedger)?'unchanged':currentLedger===null?'create':'replace',
  accountsBefore:currentLedger?.accounts.length??0,accountsAfter:(online.ledger??currentLedger)?.accounts.length??0,
  entriesBefore:currentLedger?.entries.length??0,entriesAfter:(online.ledger??currentLedger)?.entries.length??0,strategies:changes};
}
