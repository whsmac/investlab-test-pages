// Read-only reconciliation between a verified TEST user's server ledger and
// their same-account browser copy. Never writes to localStorage or Supabase.
// The server wins if the browser cannot prove it started from that exact
// server revision. Pending edits are displayed without claiming cloud sync.
import {validateLedger} from './pilot-ledger-validation.mjs';

export const TEST_LEDGER_KEY='investlab_pilot_ledger_local_v1';
export const TEST_LEDGER_OWNER_KEY='investlab_pilot_ledger_local_owner_v1';
export const cloudLedgerBaselineKey=userId=>'investlab_pilot_ledger_cloud_base_v1:'+userId;
export function stablePilotLedger(value){
 return JSON.stringify(value,(key,item)=>item&&typeof item==='object'&&!Array.isArray(item)
   ?Object.fromEntries(Object.keys(item).sort().map(name=>[name,item[name]])):item);
}
function parseLedger(raw){
 if(!raw||typeof raw!=='string')return null;
 try{
  const parsed=JSON.parse(raw);
  validateLedger(parsed);
  return parsed;
 }catch{return null;}
}
function digest(text){
 let result=2166136261;
 for(let i=0;i<text.length;i++){result^=text.charCodeAt(i);result=Math.imul(result,16777619);}
 return (result>>>0).toString(16).padStart(8,'0');
}
export function resolveVerifiedPilotLedger({userId,remote,localOwnerId,localRaw,baselineRaw}){
 if(typeof userId!=='string'||!/^[a-f0-9-]{30,50}$/i.test(userId))throw Error('확인되지 않은 TEST 계정');
 if(remote&&(!remote.payload||!remote.updated_at||typeof remote.updated_at!=='string'))
  throw Error('TEST 서버 원장 형식 또는 수정시각 오류');
 const server=remote?.payload||null;
 if(server)validateLedger(server); // Never silently fall back from corrupt server data.
 const browser=localOwnerId===userId?parseLedger(localRaw):null;
 const serverStable=server?stablePilotLedger(server):null;
 const browserStable=browser?stablePilotLedger(browser):null;
 let baseline=null;
 try{const b=JSON.parse(baselineRaw||'null');
  if(b&&typeof b.payload==='string'&&typeof b.revision==='string')baseline=b;
 }catch{}
 if(server&&browser&&browserStable!==serverStable &&
    baseline&&baseline.revision===remote.updated_at&&baseline.payload===serverStable){
  return {payload:browser,source:'LOCAL_PENDING',revision:'local:'+digest(browserStable),
    notice:'이 기기의 최근 원장 입력을 표시합니다 · TEST 서버 동기화 대기 · 다른 기기에는 아직 반영되지 않을 수 있습니다'};
 }
 if(server){
  const conflict=browser&&browserStable!==serverStable;
  return {payload:server,source:conflict?'SERVER_WITH_LOCAL_DIFFERENCE':'SERVER',
    revision:'server:'+remote.updated_at,
    notice:conflict?'TEST 서버 원장 표시 중 · 이 기기에는 다른 원장 입력이 보관되어 있습니다. 원장 화면에서 동기화 상태를 확인하세요. 자동으로 덮어쓰지 않았습니다'
      :'TEST 서버 원장과 연결 완료 · '+server.accounts.length+'계좌 / '+server.entries.length+'거래'};
 }
 if(browser){
  return {payload:browser,source:'LOCAL_PENDING',revision:'local:'+digest(browserStable),
   notice:'이 기기의 계정별 원장을 표시 중 · TEST 서버 원장 미저장 · 원장 화면에서 자동 저장 완료 여부 확인 필요'};
 }
 return {payload:null,source:'EMPTY',revision:null,
   notice:'이 TEST 계정에 서버 원장 또는 소유자 확인된 브라우저 원장이 없습니다'};
}
