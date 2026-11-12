// Pure offline comparison of exported opening review with current inputs.
const FIELDS=['exportData','accounts','allocations','cash','costConfirmations'];
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value)}
export function compareOpeningReviewExport({saved,currentInputs}={}){
 if(!saved||saved.format!=='INVESTLAB_TEST_OPENING_REVIEW'||saved.version!==1||!saved.inputs||!saved.review||!currentInputs)throw Error('unsupported review file');
 if(saved.serverVerified!==false||saved.canMigrate!==false||saved.canPost!==false||saved.authorization!=='NONE')throw Error('unsafe review file flags');
 if(!['allocation','ledger-reconciliation'].includes(saved.reviewKind)||typeof saved.createdAt!=='string'||!Number.isFinite(Date.parse(saved.createdAt)))throw Error('invalid review metadata');
 const changes=FIELDS.filter(field=>canonical(saved.inputs[field])!==canonical(currentInputs[field])).map(field=>({field,changed:true}));
 return {status:changes.length?'INPUTS_CHANGED_REVIEW_AGAIN':'INPUTS_MATCH_REVIEW_AGAIN',changes,reviewKind:saved.reviewKind,savedStatus:saved.review.status,createdAt:saved.createdAt,serverVerified:false,canPost:false,canMigrate:false};
}
