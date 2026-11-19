import {reviewRemotePersonalDocument} from './personal-sync-contract.mjs';

// TEST-only read adapter. Requires an existing verified table mapping; never writes.
const safeIdentifier=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,62}$/.test(value);
export async function readMyPersonalDocument(client,{
 verifiedUserId,sessionUserId,documentId,kind,localRevision,
 table,ownerColumn='user_id',documentColumn='document_id',envelopeColumn='envelope'
}={}){
 if(!client||!verifiedUserId||verifiedUserId!==sessionUserId)throw Error('서버 인증 계정 불일치');
 if(![table,ownerColumn,documentColumn,envelopeColumn].every(safeIdentifier))throw Error('검증되지 않은 개인 문서 테이블 또는 컬럼 설정');
 if(!['portfolio','ledger','scenario'].includes(kind))throw Error('개인 문서 종류 오류');
 const {data:auth,error:authError}=await client.auth.getUser();
 if(authError||auth?.user?.id!==verifiedUserId)throw Error('서버 사용자 재확인 실패');
 const {data,error}=await client.from(table).select([ownerColumn,documentColumn,envelopeColumn].join(','))
  .eq(ownerColumn,verifiedUserId).eq(documentColumn,documentId).limit(2);
 if(error)throw error;
 if(!Array.isArray(data)||data.length>1)throw Error('개인 문서 조회 결과 오류 또는 중복');
 if(!data.length)return {found:false,canApply:false,serverVerified:false,rlsVerified:false,canPost:false};
 const row=data[0];
 if(row?.[ownerColumn]!==verifiedUserId||row?.[documentColumn]!==documentId)throw Error('다른 사용자 또는 문서가 반환되었습니다');
 const reviewed=reviewRemotePersonalDocument(row[envelopeColumn],{
  authenticatedUserId:verifiedUserId,expectedKind:kind,expectedDocumentId:documentId,localRevision
 });
 return {found:true,...reviewed,source:'TEST_AUTHENTICATED_OWNER_SCOPED_READ_ONLY',rlsVerified:false,canPost:false};
}
