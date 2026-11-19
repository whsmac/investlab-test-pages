import {validateTestEvidenceFile,buildTestEvidenceFile} from './test-evidence-file.mjs';
import {compareBrowserSmokeReports} from './browser-smoke-compare.mjs';
export function compareCombinedTestEvidence({saved,current}={}){
 const before=validateTestEvidenceFile(saved);
 const after=validateTestEvidenceFile(current);
 const manual=compareBrowserSmokeReports({saved:before.inputs.manualReport,current:after.inputs.manualReport});
 const oldCI=before.summary.ci.status,newCI=after.summary.ci.status;
 const ciChanged=oldCI!==newCI;
 const ciImproved=oldCI==='FAILURE'&&newCI==='SUCCESS';
 const ciRegressed=oldCI==='SUCCESS'&&newCI==='FAILURE';
 const statusChanged=before.summary.status!==after.summary.status;
 return {previousStatus:before.summary.status,currentStatus:after.summary.status,statusChanged,ci:{previous:oldCI,current:newCI,changed:ciChanged,improved:ciImproved,regressed:ciRegressed,source:'MANUALLY_ENTERED_NOT_API_VERIFIED'},manual:{rows:manual.rows,changed:manual.changed,improved:manual.improved,regressed:manual.regressed},previousDate:before.createdAt,currentDate:after.createdAt,serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
}
