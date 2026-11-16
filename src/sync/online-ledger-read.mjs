// TEST online pilot: authenticated owner-scoped READ ONLY. No writes or schema changes.
export async function readMyLedgerSummary(client,{verifiedUserId,sessionUserId}={}){
 if(!client||!verifiedUserId||verifiedUserId!==sessionUserId)throw Error('서버 인증 계정 불일치');
 const {data:userData,error:userError}=await client.auth.getUser();
 if(userError||userData?.user?.id!==verifiedUserId)throw Error('서버 사용자 재확인 실패');
 const {data,error,count}=await client.from('ledger_transactions')
  .select('*',{count:'exact'}).eq('user_id',verifiedUserId).limit(20);
 if(error)throw error;
 if(!Array.isArray(data)||!Number.isSafeInteger(count)||count<0)throw Error('원장 조회 응답 오류');
 if(data.some(row=>row?.user_id!==verifiedUserId))throw Error('다른 계정의 원장 행이 반환되어 조회를 중단했습니다');
 return {count,previewRows:data.length,columns:[...new Set(data.flatMap(row=>Object.keys(row)))].sort().slice(0,80),mode:'AUTHENTICATED_OWNER_SCOPED_READ_ONLY',canPost:false,canSync:false,writeVerified:false,twoUserIsolationVerified:false};
}
