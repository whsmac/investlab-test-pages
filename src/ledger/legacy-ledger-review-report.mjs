// Exportable offline review report. This is NOT an approval, posting instruction or migration payload.
import {reviewLegacyLedgerDiscrepancies} from './legacy-ledger-discrepancy-review.mjs';
export function buildLegacyLedgerReviewReport(input={}){
 const review=reviewLegacyLedgerDiscrepancies(input);
 const checklist=[
  {id:'ACCOUNT_OWNER',label:'계좌 소유자 및 배정 확인',verified:false},
  {id:'SOURCE_AS_OF',label:'기존 파일과 원장의 기준일 확인',verified:false},
  {id:'TRADE_HISTORY',label:'누락·중복 거래내역 및 현금흐름 대조',verified:false},
  {id:'COST_BASIS',label:'취득단가와 세금 기준 별도 검증',verified:false},
  {id:'SERVER_RLS',label:'TEST 서버 권한·원자성 검증',verified:false}
 ];
 return {
  format:'INVESTLAB_LEDGER_REVIEW_REPORT',version:1,
  status:review.status,accountId:review.accountId,
  summary:{discrepancyCount:review.discrepancyCount,reviewedCount:review.reviewedCount,pendingCount:review.pendingCount},
  rows:review.rows.map(r=>({ticker:r.ticker,legacyQuantity:r.legacyQuantity,ledgerQuantity:r.ledgerQuantity,difference:r.difference,status:r.status,review:r.review})),
  checklist,approvalStatus:'NOT_APPROVED',canConfirmOpening:false,canImport:false,canPersist:false,serverVerified:false
 };
}
export function serializeLegacyLedgerReviewReport(input){return JSON.stringify(buildLegacyLedgerReviewReport(input),null,2);}
