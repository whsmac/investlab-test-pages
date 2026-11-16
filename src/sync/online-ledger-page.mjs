// Online TEST pilot: retrieve only authenticated user's ledger rows, read-only.
export async function readMyLedgerPage(client,{verifiedUserId,sessionUserId,page=0,pageSize=20}={}){
 if(!client||!verifiedUserId||verifiedUserId!==sessionUserId)throw Error('서버 인증 계정 불일치');
 if(!Number.isSafeInteger(page)||page<0||page>10000||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>50)throw Error('페이지 범위 오류');
 const {data:auth,error:authError}=await client.auth.getUser();
 if(authError||auth?.user?.id!==verifiedUserId)throw Error('서버 사용자 재확인 실패');
 const start=page*pageSize;
 const {data,error,count}=await client.from('ledger_transactions').select('*',{count:'exact'}).eq('user_id',verifiedUserId).range(start,start+pageSize-1);
 if(error)throw error;
 if(!Array.isArray(data)||!Number.isSafeInteger(count)||count<0||data.length>pageSize)throw Error('원장 페이지 응답 오류');
 if(data.some(row=>!row||row.user_id!==verifiedUserId))throw Error('다른 사용자 데이터 또는 잘못된 행이 반환됨');
 return {rows:data,count,page,pageSize,hasNext:start+data.length<count,readOnly:true,canPost:false,twoUserIsolationVerified:false};
}
