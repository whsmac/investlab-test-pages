// Offline review-file bridge for a single account's simulator starting positions.
import {prepareOpeningLedgerHandoff} from './opening-ledger-handoff.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function extractSimulatorAccountOpening({saved,accountId}={}){
 if(!saved||saved.format!=='INVESTLAB_TEST_OPENING_REVIEW'||saved.version!==1||saved.reviewKind!=='ledger-reconciliation'||saved.serverVerified!==false||saved.canPost!==false||saved.canMigrate!==false||saved.authorization!=='NONE')throw Error('지원하지 않는 초기잔고 검토 파일');
 if(!UUID.test(accountId??''))throw Error('계좌를 선택하세요');
 const i=saved.inputs;
 if(!i||!Array.isArray(i.accounts)||!Array.isArray(i.allocations)||!Array.isArray(i.cash)||!Array.isArray(i.costConfirmations))throw Error('계좌별 입력 데이터가 없습니다');
 const handoff=prepareOpeningLedgerHandoff({exportData:i.exportData,accounts:i.accounts,allocations:i.allocations,cash:i.cash,costConfirmations:i.costConfirmations});
 if(handoff.status!=='OFFLINE_OPENING_RECONCILED_NOT_SERVER_VERIFIED'||handoff.comparison.differences.length)throw Error('계좌별 초기잔고 검토가 완료되지 않았습니다');
 const id=accountId.toLowerCase(),account=i.accounts.find(a=>a.id?.toLowerCase()===id&&a.ownerConfirmed===true);
 if(!account)throw Error('소유 확인된 계좌가 없습니다');
 const positions=handoff.positions.filter(p=>p.accountId===id).map(p=>({ticker:p.ticker,quantity:Number(p.quantity),averageCost:Number(p.averageCostUsd)}));
 const usd=handoff.cash.filter(c=>c.accountId===id&&c.currency==='USD');
 if(usd.length>1)throw Error('계좌별 달러 현금이 중복되었습니다');
 const usdCash=usd.length?Number(usd[0].balance):0;
 if(!Number.isFinite(usdCash)||!positions.every(p=>Number.isFinite(p.quantity)&&Number.isFinite(p.averageCost)))throw Error('유효하지 않은 금액');
 return {accountId:id,accountName:account.name,positions,usdCash,source:'USER_SUPPLIED_OFFLINE_LEDGER_REVIEW',serverVerified:false,canPost:false,canMigrate:false};
}
