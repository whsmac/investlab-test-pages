// TEST-only online schema discovery using PostgREST OpenAPI; never writes data.
const TEST_URL='https://gopofxyezhwpfxbecrxd.supabase.co';
export async function discoverTestLedgerColumns({url,key,accessToken,fetchImpl=fetch}={}){
 if(url!==TEST_URL)throw Error('TEST Supabase 프로젝트 주소 불일치');
 if(typeof key!=='string'||!key||key.startsWith('sb_secret_')||key.toLowerCase().includes('service_role'))throw Error('공개용 키만 허용합니다');
 if(typeof accessToken!=='string'||!accessToken)throw Error('로그인 토큰이 필요합니다');
 const response=await fetchImpl(url+'/rest/v1/',{method:'GET',headers:{apikey:key,Authorization:'Bearer '+accessToken,Accept:'application/openapi+json'}});
 if(!response.ok)throw Error('TEST DB 스키마 조회 실패 (HTTP '+response.status+')');
 const document=await response.json();
 const schema=document?.definitions?.ledger_transactions;
 if(!schema||!schema.properties||typeof schema.properties!=='object'||Array.isArray(schema.properties))throw Error('원장 테이블 컬럼 정보가 API에 공개되지 않았습니다');
 const required=Array.isArray(schema.required)?schema.required:[];
 const columns=Object.entries(schema.properties).slice(0,100).map(([name,meta])=>({name,type:meta?.type||meta?.format||'unknown',required:required.includes(name),description:typeof meta?.description==='string'?meta.description.slice(0,120):''}));
 return {table:'ledger_transactions',columns,required,mode:'TEST_LIVE_OPENAPI_SCHEMA',writesEnabled:false};
}
