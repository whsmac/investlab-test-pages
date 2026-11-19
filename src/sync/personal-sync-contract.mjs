// INVESTLAB TEST: validate a proposed personal-data sync envelope without network writes.
// This module does not infer RLS safety or enable remote persistence.
export const PERSONAL_SYNC_FORMAT = 'INVESTLAB_TEST_PERSONAL_SYNC_V1';
const allowedKinds = new Set(['portfolio','ledger','scenario']);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validatePersonalSyncEnvelope(envelope,{authenticatedUserId}={}){
  if(!plain(envelope))throw Error('동기화 문서 형식 오류');
  if(envelope.format !== PERSONAL_SYNC_FORMAT || envelope.version !== 1)throw Error('지원하지 않는 동기화 형식');
  if(!uuid(authenticatedUserId) || envelope.userId !== authenticatedUserId)throw Error('로그인 사용자와 문서 소유자가 일치하지 않습니다');
  if(!allowedKinds.has(envelope.kind))throw Error('지원하지 않는 개인 데이터 유형');
  if(!uuid(envelope.documentId))throw Error('문서 식별자 오류');
  if(!Number.isSafeInteger(envelope.revision) || envelope.revision < 0)throw Error('문서 버전 오류');
  if(!plain(envelope.payload))throw Error('개인 데이터 본문 형식 오류');
  if(!Object.hasOwn(envelope,'updatedAt') || typeof envelope.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(envelope.updatedAt) || !Number.isFinite(Date.parse(envelope.updatedAt)))throw Error('수정 시각 오류');
  const serialized=JSON.stringify(envelope);
  if(serialized.length>1024*1024)throw Error('문서 크기가 1MiB를 초과합니다');
  return {valid:true,kind:envelope.kind,documentId:envelope.documentId,revision:envelope.revision,serverVerified:false,canPost:false};
}
export function comparePersonalSyncRevision({localRevision,remoteRevision}={}){
  if(!Number.isSafeInteger(localRevision)||localRevision<0||!Number.isSafeInteger(remoteRevision)||remoteRevision<0)throw Error('비교할 문서 버전 오류');
  return {state:localRevision===remoteRevision?'MATCH':localRevision>remoteRevision?'LOCAL_AHEAD':'REMOTE_AHEAD',autoOverwrite:false,canPost:false};
}

/**
 * Validate a server-returned personal document before exposing it to a module.
 * Read-only: callers must separately verify RLS and authorize any future writes.
 */
export function reviewRemotePersonalDocument(remote,{authenticatedUserId,expectedKind,expectedDocumentId,localRevision}={}){
 const checked=validatePersonalSyncEnvelope(remote,{authenticatedUserId});
 if(checked.kind!==expectedKind)throw Error('요청한 데이터 유형과 서버 문서 유형이 다릅니다');
 if(checked.documentId!==expectedDocumentId)throw Error('요청한 문서와 서버 응답 문서가 다릅니다');
 const revision=comparePersonalSyncRevision({localRevision,remoteRevision:checked.revision});
 return {
  documentId:checked.documentId,kind:checked.kind,remoteRevision:checked.revision,
  revisionState:revision.state,canApply:revision.state==='MATCH',
  requiresReview:revision.state!=='MATCH',
  serverVerified:false,rlsVerified:false,canPost:false,autoOverwrite:false,
  payload:revision.state==='MATCH'?structuredClone(remote.payload):null
 };
}
