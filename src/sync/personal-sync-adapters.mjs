import {PERSONAL_SYNC_FORMAT,validatePersonalSyncEnvelope} from './personal-sync-contract.mjs';

// Pure, offline-only conversion. No localStorage writes, Supabase calls, or implicit migration.
const storageKeys = Object.freeze({
  holdings:'investlab_holdings',
  watchlist:'investlab_watchlist',
  past:'investlab_past_symbols'
});
function readArray(storage,key){
  const raw=storage?.getItem(key);
  if(raw===null||raw===undefined)return [];
  const value=JSON.parse(raw);
  if(!Array.isArray(value))throw Error(key+' 데이터는 배열이어야 합니다');
  return value;
}
export function buildPortfolioSyncEnvelope(storage,{authenticatedUserId,documentId,revision=0,updatedAt}={}){
  const payload={
    holdings:readArray(storage,storageKeys.holdings),
    watchlist:readArray(storage,storageKeys.watchlist),
    past:readArray(storage,storageKeys.past)
  };
  const envelope={
    format:PERSONAL_SYNC_FORMAT,version:1,userId:authenticatedUserId,
    documentId,kind:'portfolio',revision,updatedAt,payload
  };
  validatePersonalSyncEnvelope(envelope,{authenticatedUserId});
  return envelope;
}
export function buildLedgerSyncEnvelope(ledger,{authenticatedUserId,documentId,revision=0,updatedAt}={}){
  if(!ledger||typeof ledger!=='object'||Array.isArray(ledger))throw Error('원장 JSON은 객체여야 합니다');
  const envelope={
    format:PERSONAL_SYNC_FORMAT,version:1,userId:authenticatedUserId,
    documentId,kind:'ledger',revision,updatedAt,payload:{ledger}
  };
  validatePersonalSyncEnvelope(envelope,{authenticatedUserId});
  return envelope;
}
export function previewPersonalSyncEnvelope(envelope,{authenticatedUserId}={}){
  const validation=validatePersonalSyncEnvelope(envelope,{authenticatedUserId});
  const data=validation.kind==='portfolio'
    ? {holdings:envelope.payload.holdings?.length??0,watchlist:envelope.payload.watchlist?.length??0,past:envelope.payload.past?.length??0}
    : {ledgerPresent:validation.kind==='ledger'};
  return {...validation,counts:data,mode:'OFFLINE_PREVIEW_ONLY',canPost:false};
}
