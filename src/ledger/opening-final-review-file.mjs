import {finalizeOpeningOfflineReview} from './opening-final-review.mjs';
const FORMAT='INVESTLAB_TEST_FINAL_OPENING_REVIEW';
export function buildFinalOpeningReviewFile({inputs,createdAt}={}){
 if(!inputs||typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt)))throw Error('invalid final review inputs or date');
 const review=finalizeOpeningOfflineReview(inputs);
 return {format:FORMAT,version:1,createdAt,inputs,review,serverVerified:false,canPost:false,canMigrate:false,authorization:'NONE'};
}
export function compareFinalOpeningReviewFile({saved,currentInputs}={}){
 if(!saved||saved.format!==FORMAT||saved.version!==1||saved.serverVerified!==false||saved.canPost!==false||saved.canMigrate!==false||saved.authorization!=='NONE'||!saved.inputs||!saved.review)throw Error('unsafe or unsupported final review file');
 if(saved.review.serverVerified!==false||saved.review.canPost!==false||saved.review.canMigrate!==false||saved.review.authorization!=='NONE')throw Error('unsafe nested review flags');
 const current=finalizeOpeningOfflineReview(currentInputs);
 const before=finalizeOpeningOfflineReview(saved.inputs);
 const key=i=>[i.type,i.account??'',i.ticker??'',i.detail??'',i.remaining??''].join('|');
 const old=new Map(before.issues.map(i=>[key(i),i])),now=new Map(current.issues.map(i=>[key(i),i]));
 return {previousStatus:before.status,currentStatus:current.status,resolved:[...old].filter(([k])=>!now.has(k)).map(([,v])=>v),newIssues:[...now].filter(([k])=>!old.has(k)).map(([,v])=>v),serverVerified:false,canPost:false,canMigrate:false};
}
