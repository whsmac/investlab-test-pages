// Pure presentation model for TEST offline opening review. Never authorizes migration.
export function summarizeOpeningReview({review,accounts=[]}={}){
 if(!review||!Array.isArray(accounts))throw Error('review and accounts required');
 const names=new Map(accounts.map(a=>[a.id?.toLowerCase(),a.name||a.id]));
 const positions=(review.positions||review.allocatedPositions||[]).map(p=>({accountId:p.accountId,account:names.get(p.accountId)||p.accountId,type:'종목',asset:p.ticker,quantity:p.quantity,averageCostUsd:p.averageCostUsd||'',status:'검토 대상'}));
 const cash=(review.cash||review.explicitCash||[]).map(c=>({accountId:c.accountId,account:names.get(c.accountId)||c.accountId,type:'현금',asset:c.currency,quantity:c.balance,averageCostUsd:'',status:'검토 대상'}));
 const issues=review.issues||review.warnings||[];
 const matched=review.status==='OFFLINE_OPENING_RECONCILED_NOT_SERVER_VERIFIED'&&issues.length===0&&review.comparison?.differences?.length===0;
 return {status:matched?'오프라인 원장 수량 대조 일치':'검토 필요',rows:[...positions,...cash].map(r=>({...r,status:matched?'오프라인 수량 일치':'확인 필요'})),issues,accountCount:new Set([...positions,...cash].map(r=>r.accountId)).size,positionCount:positions.length,cashCount:cash.length,comparison:review.comparison??null,serverVerified:false,canPost:false,canMigrate:false};
}
