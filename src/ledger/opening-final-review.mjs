import {summarizeOpeningAccountReadiness} from './opening-account-readiness.mjs';
// Final offline review only. Does not grant server authorization.
export function finalizeOpeningOfflineReview(input={}){
 const review=summarizeOpeningAccountReadiness(input);
 const issues=[];
 for(const row of review.quantities.rows)if(row.status!=='수량 일치')issues.push({type:'QUANTITY',ticker:row.ticker,detail:row.status,remaining:row.remaining});
 for(const row of review.rows){
  if(row.ownership!=='확인')issues.push({type:'OWNERSHIP',account:row.account,ticker:row.ticker,detail:'계좌 소유 미확인'});
  if(row.cost!=='확인')issues.push({type:'COST',account:row.account,ticker:row.ticker,detail:'취득원가 미확인'});
 }
 if(!review.rows.length)issues.push({type:'POSITIONS',detail:'계좌별 종목 배정 없음'});
 return {status:issues.length?'OFFLINE_REVIEW_INCOMPLETE':'OFFLINE_REVIEW_READY',issues,accountPositionCount:review.rows.length,checkedAt:null,canPost:false,canMigrate:false,serverVerified:false,authorization:'NONE'};
}
