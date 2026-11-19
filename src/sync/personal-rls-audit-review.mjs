// Offline-only summary of SQL audit query #5 exported as a JSON array.
// Metadata inspection cannot prove RLS isolation or authorize writes.
const statuses=new Set(['VIEW_REQUIRES_SEPARATE_REVIEW','RLS_DISABLED_REVIEW_REQUIRED','NO_POLICIES_REVIEW_REQUIRED','POLICIES_PRESENT_MANUAL_REVIEW_REQUIRED']);
export function summarizePersonalRlsAudit(rows){
 if(!Array.isArray(rows)||rows.length>500)throw Error('점검 결과는 500행 이하 JSON 배열이어야 합니다');
 const seen=new Set(),items=[];
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row)||row.schema_name!=='public'||typeof row.object_name!=='string'||!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(row.object_name)||!statuses.has(row.review_status))throw Error('SQL 5번 결과 형식 오류');
  if(seen.has(row.object_name))throw Error('중복 객체: '+row.object_name);
  seen.add(row.object_name);
  if(typeof row.rls_enabled!=='boolean'||!['policy_count','read_policy_count','write_policy_count'].every(k=>Number.isSafeInteger(Number(row[k]))&&Number(row[k])>=0)||!['authenticated_select_grant','authenticated_insert_grant','authenticated_update_grant','authenticated_delete_grant'].every(k=>typeof row[k]==='boolean'))throw Error('정책 수 또는 권한 값 오류');
  items.push({name:row.object_name,status:row.review_status,rls:row.rls_enabled,policies:Number(row.policy_count),read:Number(row.read_policy_count),write:Number(row.write_policy_count)});
 }
 return {objects:items.length,requiresReview:items.length,items,serverVerified:false,twoUserIsolationVerified:false,canPost:false,canSync:false,mode:'OFFLINE_METADATA_REVIEW_ONLY'};
}
