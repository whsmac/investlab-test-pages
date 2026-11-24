// Review-only financial refresh planner. No publication, network, or database writes.
import {validateLocalSecChartReview,fields} from './sec-local-chart-review.mjs';
const key=r=>r.ticker+':'+r.period_end;
export function planSecRefresh(previous,candidate){
 const old=validateLocalSecChartReview(previous),next=validateLocalSecChartReview(candidate);
 if(candidate.as_of<previous.as_of)throw Error('신규 자료 기준일이 이전 자료보다 오래되었습니다.');
 const oldBy=new Map(old.map(r=>[key(r),r])),newBy=new Map(next.map(r=>[key(r),r]));
 const conflicts=[],additions=[],retained=[],missing=[],pendingFills=[];
 for(const a of old){
  const b=newBy.get(key(a));
  if(!b){missing.push(key(a));retained.push(a);continue;}
  for(const f of fields){
   if(a[f]!==null&&b[f]!==null&&a[f]!==b[f])conflicts.push({key:key(a),field:f,previous:a[f],candidate:b[f]});
   if(a[f]===null&&b[f]!==null)pendingFills.push({key:key(a),field:f});
  }
  // Preserve prior row, source and evidence labels. Historical revisions and fills require manual review.
  retained.push(a);
 }
 for(const b of next)if(!oldBy.has(key(b)))additions.push(b);
 const blocked=conflicts.length>0;
 const report={status:blocked?'BLOCKED_HISTORICAL_CONFLICT':additions.length?'NEW_ROWS_REVIEW_REQUIRED':'KEEP_PREVIOUS',
  publication_allowed:false,database_writes:0,previousRows:old.length,candidateRows:next.length,
  missingPriorRows:missing,pendingFills,conflicts,newRows:additions.map(key),retainedRows:old.length};
 if(blocked||!additions.length)return {report,snapshot:null};
 const snapshot={format:previous.format,source:previous.source,as_of:candidate.as_of,publication_allowed:false,database_writes:0,rows:[...retained,...additions].sort((a,b)=>key(a).localeCompare(key(b)))};
 validateLocalSecChartReview(snapshot);
 return {report,snapshot};
}
