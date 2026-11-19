// TEST-only authenticated PostgREST probe. A successful empty select proves neither RLS nor write access.
export async function probeTestPersonalDocumentRead(client,{verifiedUserId,sessionUserId,table='personal_documents'}={}){
 if(!client||!verifiedUserId||verifiedUserId!==sessionUserId)throw Error('서버 인증 계정 불일치');
 if(table!=='personal_documents')throw Error('허용되지 않은 테이블');
 const {data:auth,error:authError}=await client.auth.getUser();
 if(authError||auth?.user?.id!==verifiedUserId)throw Error('서버 사용자 재확인 실패');
 const {error}=await client.from(table).select('user_id,document_id,envelope').eq('user_id',verifiedUserId).limit(0);
 if(error){
  const code=String(error.code||''),message=String(error.message||'');
  const missing=code==='42P01'||code==='PGRST205'||code==='PGRST204';
  const denied=code==='42501'||/permission denied/i.test(message);
  return {status:missing?'not_found':denied?'permission_denied':'query_failed',code:code||'unknown',message:message.slice(0,250),columnsQuerySucceeded:false,rlsVerified:false,writesEnabled:false};
 }
 return {status:'select_accepted',columnsQuerySucceeded:true,rlsVerified:false,writesEnabled:false,
  note:'필수 컬럼 SELECT 요청 성공. 테이블 전체 구조·RLS 격리·실제 데이터 조회·쓰기 권한은 검증되지 않았습니다.'};
}
