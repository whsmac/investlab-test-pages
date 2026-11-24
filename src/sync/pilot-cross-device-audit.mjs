// INVESTLAB TEST — READ ONLY cross-device audit of one authenticated user's
// server ledger and saved simulator strategies. Never saves, mutates or exports
// personal records. A cloud fingerprint is comparable between devices ONLY
// when both screens use the same verified account and server revision.
import {validateLedger} from '../ledger/pilot-ledger-validation.mjs';
import {projectLedger} from '../ledger/pilot-portfolio-projection.mjs';
import {resolveVerifiedPilotLedger,stablePilotLedger} from '../ledger/pilot-ledger-readonly-consistency.mjs';

const OWNER=/^[a-f0-9-]{30,50}$/i;
const BLOCKED_NAMES=new Set(['__proto__','prototype','constructor']);
const validName=name=>typeof name==='string'&&name.length>0&&name.length<=80&&!BLOCKED_NAMES.has(name);
const cleanNumber=n=>Number.isFinite(n)?Number(n.toFixed(8)):null;

export function verifyStrategyRows(rows){
 if(!Array.isArray(rows)||rows.length>100)throw Error('TEST 서버 전략 목록이 너무 많거나 일부만 조회되었습니다');
 const names=new Set();
 for(const r of rows){
  if(!r||!validName(r.name)||names.has(r.name)||!Array.isArray(r.strategies)
    ||r.strategies.length<1||r.strategies.length>30)
   throw Error('서버 전략 목록의 형식이 올바르지 않습니다');
  names.add(r.name);
 }
 return [...rows].sort((a,b)=>a.name.localeCompare(b.name,'en'));
}
export function projectServerAudit({ownerId,remote,strategies,localOwnerId,localRaw,
    baselineRaw,localStrategiesRaw=null,localDraftRaw=null}){
 if(typeof ownerId!=='string'||!OWNER.test(ownerId))throw Error('확인되지 않은 TEST 계정');
 const safeStrategies=verifyStrategyRows(strategies);
 if(remote!==null&&remote!==undefined&&(!remote.payload||typeof remote.updated_at!=='string'))
  throw Error('TEST 서버 원장 응답 형식 오류');
 const serverLedger=remote?.payload??null;
 if(serverLedger)validateLedger(serverLedger);
 const choice=resolveVerifiedPilotLedger({
  userId:ownerId,remote:remote||null,localOwnerId,localRaw,baselineRaw
 });
 const rows=serverLedger?serverLedger.accounts.map(account=>{
  const view=projectLedger(serverLedger,account.id);
  const symbols=view.holdings.map(h=>({ticker:h.symbol,quantity:cleanNumber(h.qty)}));
  return {name:account.name,holdings:symbols,cashUSD:cleanNumber(view.cash.USD),
   cashKRW:cleanNumber(view.cash.KRW)};
 }):[];
 const combined=serverLedger?projectLedger(serverLedger,'ALL'):null;
 let localStrategyNames=null,badLocalStrategies=false;
 if(localStrategiesRaw!==null&&localStrategiesRaw!==undefined){
  try{
   const value=JSON.parse(localStrategiesRaw);
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>200)
    throw Error('Local strategy map malformed');
   localStrategyNames=Object.keys(value);
   if(localStrategyNames.some(name=>!validName(name)||!Array.isArray(value[name])))
    throw Error('Local strategy entry malformed');
  }catch{badLocalStrategies=true;}
 }
 const serverByName=new Map(safeStrategies.map(r=>[r.name,stablePilotLedger(r.strategies)]));
 let extraLocal=0,changedLocal=0,missingLocal=0;
 if(localStrategyNames!==null&&!badLocalStrategies){
  const local=JSON.parse(localStrategiesRaw);
  for(const name of localStrategyNames){
   if(!serverByName.has(name))extraLocal++;
   else if(stablePilotLedger(local[name])!==serverByName.get(name))changedLocal++;
  }
  for(const item of safeStrategies)if(!Object.hasOwn(local,item.name))missingLocal++;
 }
 const ledgerStatus=serverLedger
  ?(choice.source==='SERVER'?'SERVER_MATCH':
      choice.source==='LOCAL_PENDING'?'LOCAL_PENDING':'LOCAL_DIFFERENCE')
  :(choice.source==='LOCAL_PENDING'?'SERVER_MISSING_LOCAL_ONLY':'SERVER_EMPTY');
 const strategiesStatus=badLocalStrategies?'INVALID_LOCAL':
  localStrategyNames===null?'CLOUD_ONLY':
  extraLocal||changedLocal?'LOCAL_DIFFERENCE':
  missingLocal?'CLOUD_NOT_DOWNLOADED':'MATCH';
 const warning=ledgerStatus==='LOCAL_PENDING'||ledgerStatus==='LOCAL_DIFFERENCE'
  ||ledgerStatus==='SERVER_MISSING_LOCAL_ONLY'||strategiesStatus==='LOCAL_DIFFERENCE'
  ||strategiesStatus==='INVALID_LOCAL';
 return {
  ownerVerified:true,ledgerStatus,strategiesStatus,warning,
  accountCount:serverLedger?.accounts.length??0,
  transactionCount:serverLedger?.entries.length??0,
  holdingCount:combined?.holdings.length??0,
  strategyCount:safeStrategies.length,
  serverLedgerUpdatedAt:remote?.updated_at||null,
  latestStrategyUpdateAt:safeStrategies.map(r=>r.updated_at).filter(t=>typeof t==='string').sort().at(-1)||null,
  accountRows:rows,serverStrategyNames:safeStrategies.map(r=>r.name),
  localExtraStrategies:extraLocal,localChangedStrategies:changedLocal,
  localMissingStrategies:missingLocal,hasLocalDraft:Boolean(localDraftRaw),
  // Fingerprint always uses *verified cloud data*, never an unsaved browser draft.
  fingerprintInput:stablePilotLedger({
   version:1,ownerId,ledger:serverLedger,
   strategies:safeStrategies.map(r=>({name:r.name,strategies:r.strategies}))
  })
 };
}
export async function cloudFingerprint(input,cryptoApi=globalThis.crypto){
 if(typeof input!=='string'||input.length>12_000_000)throw Error('동기화 데이터 형식 또는 용량 오류');
 if(!cryptoApi?.subtle?.digest)throw Error('안전한 동기화 비교 기능을 지원하지 않는 브라우저입니다');
 const bytes=new TextEncoder().encode(input);
 const digest=await cryptoApi.subtle.digest('SHA-256',bytes);
 return 'IL1-'+[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,16).toUpperCase();
}
export const ledgerStatusText=Object.freeze({
 SERVER_MATCH:'TEST 서버 원장과 이 기기의 저장값이 일치합니다',
 LOCAL_PENDING:'이 기기에서 저장했으나 아직 서버에 동기화되지 않은 원장 변경이 있습니다',
 LOCAL_DIFFERENCE:'이 기기와 서버 원장에 차이가 있습니다. 자동 덮어쓰지 않았습니다',
 SERVER_MISSING_LOCAL_ONLY:'서버 원장은 없고 이 기기의 원장만 있습니다. 다른 기기에는 표시되지 않습니다',
 SERVER_EMPTY:'TEST 서버에 저장된 원장이 없습니다'
});
export const strategyStatusText=Object.freeze({
 MATCH:'서버 저장 전략과 이 기기 전략 목록이 일치합니다',
 CLOUD_ONLY:'서버에 저장된 전략을 확인했습니다. 이 기기의 저장 목록은 아직 없습니다',
 CLOUD_NOT_DOWNLOADED:'서버에는 저장돼 있으나 이 기기에는 아직 불러오지 않은 전략이 있습니다',
 LOCAL_DIFFERENCE:'이 기기와 서버의 전략 목록에 차이가 있습니다. 자동으로 덮어쓰지 않았습니다',
 INVALID_LOCAL:'이 기기 전략 저장 형식이 올바르지 않습니다'
});
