// Cross-file RPC contract audit; offline only. Never executes SQL.
const getParams=sql=>{
 const m=sql.match(/create\s+or\s+replace\s+function\s+public\.investlab_post_opening_v1\s*\(([\s\S]*?)\)\s*returns\s+uuid/i);
 if(!m)return [];
 return [...m[1].matchAll(/\b(p_[a-z_]+)\s+(?:uuid|text|jsonb)\b/gi)].map(x=>x[1].toLowerCase());
};
export function auditOpeningRpcContract({sql,preview}){
 if(typeof sql!=='string'||!preview||typeof preview!=='object')throw Error('SQL and RPC preview required');
 const declared=getParams(sql);
 const supplied=Object.keys(preview.args||{}).sort();
 const missing=supplied.filter(k=>!declared.includes(k));
 const unexpected=declared.filter(k=>!supplied.includes(k));
 const blockers=[];
 if(!/\bpayload_hash\b/i.test(sql))blockers.push('missing stored payload hash');
 if(!/pg_catalog\.digest\s*\(/i.test(sql))blockers.push('missing independent server-side SHA-256');
 if(!/\bfor\s+update\b/i.test(sql))blockers.push('missing account row lock');
 if(!/\bauth\.uid\s*\(/i.test(sql))blockers.push('missing authenticated owner');
 if(/raise\s+exception\s+'BLOCKED:/i.test(sql))blockers.push('explicit fail-closed SQL blocker');
 if(missing.length)blockers.push('RPC parameters missing: '+missing.join(', '));
 if(unexpected.length)blockers.push('unexpected RPC parameters: '+unexpected.join(', '));
 return {status:blockers.length?'BLOCKED':'STATIC_CONTRACT_MATCH_NOT_SERVER_VERIFIED',declared,supplied,blockers,canExecute:false,serverVerified:false};
}
