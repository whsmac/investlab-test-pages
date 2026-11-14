import {finalizeOpeningOfflineReview} from './opening-final-review.mjs';
const FORMAT='INVESTLAB_TEST_FINAL_OPENING_REVIEW';
export function buildFinalOpeningReviewFile({inputs,createdAt}={}){
 if(!inputs||typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt)))throw Error('invalid final review inputs or date');
 const review=finalizeOpeningOfflineReview(inputs);
 return {format:FORMAT,version:1,createdAt,inputs,review,serverVerified:false,canPost:false,canMigrate:false,authorization:'NONE'};
}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object'){const out={};for(const k of Object.keys(value).sort())out[k]=canonical(value[k]);return out}return value}
function equal(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}
export function validateFinalOpeningReviewFile(saved){
 if(!saved||saved.format!==FORMAT||saved.version!==1||saved.serverVerified!==false||saved.canPost!==false||saved.canMigrate!==false||saved.authorization!=='NONE'||!saved.inputs||!saved.review)throw Error('unsafe or unsupported final review file');
 if(saved.review.serverVerified!==false||saved.review.canPost!==false||saved.review.canMigrate!==false||saved.review.authorization!=='NONE')throw Error('unsafe nested review flags');
 if(typeof saved.createdAt!=='string'||!Number.isFinite(Date.parse(saved.createdAt)))throw Error('invalid saved date');
 const computed=finalizeOpeningOfflineReview(saved.inputs);
 if(!equal(saved.review,computed))throw Error('saved review does not match input data');
 return computed;
}
export function compareFinalOpeningReviewFile({saved,currentInputs}={}){
 const before=validateFinalOpeningReviewFile(saved);
 const current=finalizeOpeningOfflineReview(currentInputs);
 const key=i=>[i.type,i.account??'',i.ticker??'',i.detail??'',i.remaining??''].join('|');
 const old=new Map(before.issues.map(i=>[key(i),i])),now=new Map(current.issues.map(i=>[key(i),i]));
 return {previousStatus:before.status,currentStatus:current.status,resolved:[...old].filter(([k])=>!now.has(k)).map(([,v])=>v),newIssues:[...now].filter(([k])=>!old.has(k)).map(([,v])=>v),serverVerified:false,canPost:false,canMigrate:false};
}
