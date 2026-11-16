// TEST-only single transaction insert, explicit UI confirmation required. Never runs automatically.
export function buildTestTrade({date,type,symbol,quantity,price,currency='USD',note=''},{userId,transactionId,requestId}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('거래일 형식 오류');
 if(!['BUY','SELL'].includes(type))throw Error('매수·매도 유형만 허용합니다');
 if(!/^[A-Z][A-Z0-9.\-]{0,14}$/.test(symbol||''))throw Error('종목코드 형식 오류');
 const qty=Number(quantity),unit=Number(price);
 if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(unit)||unit<=0||!/^\d+(?:\.\d{1,8})?$/.test(String(quantity))||!/^\d+(?:\.\d{1,8})?$/.test(String(price)))throw Error('수량·단가는 양수여야 합니다');
 if(!['USD','KRW'].includes(currency))throw Error('통화 형식 오류');
 if(typeof note!=='string'||note.length>300)throw Error('비고 최대 300자');
 if(!/^[0-9a-f-]{36}$/i.test(userId||'')||!/^[0-9a-f-]{36}$/i.test(transactionId||'')||!/^[0-9a-f-]{36}$/i.test(requestId||''))throw Error('거래 식별값 오류');
 return {id:transactionId,user_id:userId,transaction_date:date,sequence_no:1,transaction_type:type,symbol,quantity:qty,unit_price:unit,currency,gross_amount:null,withholding_tax:0,fees:0,from_currency:null,from_amount:null,to_currency:null,to_amount:null,idempotency_key:requestId,note};
}
export async function insertTestTrade(client,row,{verifiedUserId,sessionUserId}={}){
 if(!client||!verifiedUserId||verifiedUserId!==sessionUserId||row?.user_id!==verifiedUserId)throw Error('사용자 인증 불일치');
 const {data:auth,error:authError}=await client.auth.getUser();if(authError||auth?.user?.id!==verifiedUserId)throw Error('서버 인증 재확인 실패');
 const {data,error}=await client.from('ledger_transactions').insert(row).select('id,user_id,transaction_date,transaction_type,symbol,quantity,unit_price').single();
 if(error)throw error;
 if(!data||data.id!==row.id||data.user_id!==verifiedUserId)throw Error('저장 응답 검증 실패: 재조회 필요');
 return data;
}
