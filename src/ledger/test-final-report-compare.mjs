import {validateTestFinalReport} from './test-final-report.mjs';
const rank={FINAL_REVIEW_INCOMPLETE:0,OFFLINE_FILES_REVIEWED_SERVER_PENDING:1};
export function compareTestFinalReports({previous,current}={}){
 const before=validateTestFinalReport(previous),after=validateTestFinalReport(current);
 const changed=before.status!==after.status;
 const improved=rank[after.status]>rank[before.status],regressed=rank[after.status]<rank[before.status];
 const oldChecks=new Map(previous.readiness.checks.map(x=>[x.id,x.status]));
 const rows=current.readiness.checks.map(x=>({id:x.id,previous:oldChecks.get(x.id)??'UNKNOWN',current:x.status,changed:oldChecks.get(x.id)!==x.status}));
 return {previousStatus:before.status,currentStatus:after.status,changed,improved,regressed,rows,previousDate:previous.createdAt,currentDate:current.createdAt,serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
}
