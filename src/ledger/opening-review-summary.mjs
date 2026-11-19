// Pure TEST presentation model. Comparison is offline only, never server verification.
export function summarizeOpeningReview({review,accounts=[]}={}){
 if(!review||!Array.isArray(accounts))throw Error('review and accounts required');
 const names=new Map(accounts.map(a=>[a.id?.toLowerCase(),a.name||a.id]));
 const differences=review.comparison?.differences||[];
 const byAsset=new Map(differences.map(d=>[d.accountAsset,d]));
 const issues=review.issues||review.warnings||[];
 const matched=review.status==='OFFLINE_OPENING_RECONCILED_NOT_SERVER_VERIFIED'&&issues.length===0&&Array.isArray(review.comparison?.differences)&&differences.length===0;
 const rows=[];
 for(const p of review.positions||review.allocatedPositions||[])rows.push({accountId:p.accountId,account:names.get(p.accountId)||p.accountId,type:'종목',asset:p.ticker,quantity:p.quantity,averageCostUsd:p.averageCostUsd||'',key:p.accountId+' / security:'+p.ticker});
 for(const c of review.cash||review.explicitCash||[])rows.push({accountId:c.accountId,account:names.get(c.accountId)||c.accountId,type:'현금',asset:c.currency,quantity:c.balance,averageCostUsd:'',key:c.accountId+' / cash:'+c.currency});
 const presented=rows.map(({key,...row})=>{const difference=byAsset.get(key);return {...row,status:difference?'수량 불일치':matched?'오프라인 수량 일치':'확인 필요',portfolio: difference?.portfolio??null,ledger:difference?.ledger??null,delta:difference?.delta??null}});
 const listed=new Set(rows.map(r=>r.key));
 const unlisted=differences.filter(d=>!listed.has(d.accountAsset)).map(d=>({accountId:'',account:d.accountAsset,type:'추가 차이',asset:'',quantity:'',averageCostUsd:'',status:'수량 불일치',portfolio:d.portfolio,ledger:d.ledger,delta:d.delta}));
 return {status:differences.length?'원장 수량 불일치':matched?'오프라인 원장 수량 대조 일치':'검토 필요',rows:[...presented,...unlisted],issues,accountCount:new Set(rows.map(r=>r.accountId)).size,positionCount:rows.filter(r=>r.type==='종목').length,cashCount:rows.filter(r=>r.type==='현금').length,mismatchCount:differences.length,comparison:review.comparison??null,serverVerified:false,canPost:false,canMigrate:false};
}
