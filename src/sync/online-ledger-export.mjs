// Authenticated TEST ledger full read, capped and read-only. No mutation or schema assumptions.
import {readMyLedgerPage} from './online-ledger-page.mjs';
export async function readMyLedgerAll(client,{verifiedUserId,sessionUserId,maxRows=1000}={}){
 if(!Number.isSafeInteger(maxRows)||maxRows<1||maxRows>1000)throw Error('최대 조회 건수 오류');
 const rows=[];let total=null;
 for(let page=0;page<Math.ceil(maxRows/50);page++){
  const size=Math.min(50,maxRows-rows.length);
  const result=await readMyLedgerPage(client,{verifiedUserId,sessionUserId,page,pageSize:50});
  if(total===null){total=result.count;if(total>maxRows)throw Error('원장 '+total+'건: 최대 '+maxRows+'건을 초과하여 전체 다운로드를 중단합니다');}
  if(result.count!==total)throw Error('조회 중 원장 건수가 변경되었습니다. 다시 조회하세요');
  rows.push(...result.rows);
  if(!result.hasNext)break;
 }
 if(rows.length!==total)throw Error('전체 원장 조회가 완료되지 않았습니다');
 return {rows,total,format:'INVESTLAB_TEST_LEDGER_READ_EXPORT_V1',readOnly:true,canPost:false};
}
