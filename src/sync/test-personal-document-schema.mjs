// TEST-only OpenAPI inspection for an existing personal document table.
// Metadata visibility is not proof of RLS or write permission.
const TEST_URL='https://gopofxyezhwpfxbecrxd.supabase.co';
const required=['user_id','document_id','envelope'];
export async function inspectTestPersonalDocumentSchema({url,key,accessToken,table='personal_documents',fetchImpl=fetch}={}){
 if(url!==TEST_URL)throw Error('TEST Supabase 프로젝트 주소 불일치');
 if(typeof key!=='string'||!key||key.startsWith('sb_secret_')||key.toLowerCase().includes('service_role'))throw Error('공개용 키만 허용합니다');
 if(typeof accessToken!=='string'||!accessToken)throw Error('로그인 토큰이 필요합니다');
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(table))throw Error('테이블 이름 오류');
 const response=await fetchImpl(url+'/rest/v1/',{method:'GET',headers:{apikey:key,Authorization:'Bearer '+accessToken,Accept:'application/openapi+json'}});
 if(!response.ok)throw Error('TEST 메타데이터 조회 실패 (HTTP '+response.status+')');
 const openapi=await response.json();
 const schema=openapi?.definitions?.[table];
 if(!schema||!schema.properties||typeof schema.properties!=='object'||Array.isArray(schema.properties)){
  return {table,existsInOpenApi:false,columns:[],missingColumns:required,readAdapterCompatible:false,rlsVerified:false,writesEnabled:false};
 }
 const columns=Object.keys(schema.properties).slice(0,100);
 const missingColumns=required.filter(name=>!columns.includes(name));
 return {table,existsInOpenApi:true,columns,missingColumns,readAdapterCompatible:missingColumns.length===0,rlsVerified:false,writesEnabled:false};
}
