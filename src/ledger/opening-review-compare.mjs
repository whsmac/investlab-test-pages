// Pure offline comparison of exported opening review with current inputs.
const FIELDS=['exportData','accounts','allocations','cash','costConfirmations'];
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value)}
const DEC=/^(0|[1-9]\\d*)(?:\\.\\d{1,8})?$/;
function units(value){const str=String(value);if(!DEC.test(str))return null;const [whole,part='']=str.split('.');return BigInt(whole)*100000000n+BigInt(part.padEnd(8,'0'))}
function delta(before,after){const a=units(before),b=units(after);if(a===null||b===null)return null;const d=b-a,negative=d<0n,n=negative?-d:d;return (negative?'-':'+')+(n/100000000n).toString()+'.'+(n%100000000n).toString().padStart(8,'0')}
function rows(inputs){
 const result=[];
 for(const h of inputs.exportData?.holdings||[])result.push({key:'holding|'+h.symbol,kind:'보유종목',account:'전체',asset:h.symbol,quantity:h.shares});
 for(const a of inputs.allocations||[])result.push({key:'allocation|'+a.accountId+'|'+a.ticker,kind:'계좌 배정',account:a.accountId,asset:a.ticker,quantity:a.quantity});
 for(const c of inputs.cash||[])result.push({key:'cash|'+c.accountId+'|'+c.currency,kind:'현금',account:c.accountId,asset:c.currency,quantity:c.balance});
 return result;
}
export function detailOpeningInputChanges(before,after){
 const a=rows(before),b=rows(after),left=new Map(),right=new Map();
 for(const row of a){if(left.has(row.key))throw Error('duplicate saved comparison row');left.set(row.key,row)}
 for(const row of b){if(right.has(row.key))throw Error('duplicate current comparison row');right.set(row.key,row)}
 return [...new Set([...left.keys(),...right.keys()])].sort().filter(key=>left.get(key)?.quantity!==right.get(key)?.quantity).map(key=>{const previous=left.get(key),current=right.get(key),row=current||previous;return {kind:row.kind,account:row.account,asset:row.asset,before:previous?.quantity??'—',after:current?.quantity??'—',delta:previous&&current?delta(previous.quantity,current.quantity):null,change:!previous?'추가':!current?'삭제':'변경'}});
}
export function compareOpeningReviewExport({saved,currentInputs}={}){
 if(!saved||saved.format!=='INVESTLAB_TEST_OPENING_REVIEW'||saved.version!==1||!saved.inputs||!saved.review||!currentInputs)throw Error('unsupported review file');
 if(saved.serverVerified!==false||saved.canMigrate!==false||saved.canPost!==false||saved.authorization!=='NONE')throw Error('unsafe review file flags');
 if(!['allocation','ledger-reconciliation'].includes(saved.reviewKind)||typeof saved.createdAt!=='string'||!Number.isFinite(Date.parse(saved.createdAt)))throw Error('invalid review metadata');
 const details=detailOpeningInputChanges(saved.inputs,currentInputs);
 const changes=FIELDS.filter(field=>canonical(saved.inputs[field])!==canonical(currentInputs[field])).map(field=>({field,changed:true}));
 return {status:changes.length?'INPUTS_CHANGED_REVIEW_AGAIN':'INPUTS_MATCH_REVIEW_AGAIN',changes,details,reviewKind:saved.reviewKind,savedStatus:saved.review.status,createdAt:saved.createdAt,serverVerified:false,canPost:false,canMigrate:false};
}
