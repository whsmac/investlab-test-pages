// HOME sign-in reuses the TEST Supabase session and public-key configuration used by all modules.
const TEST_URL='https://gopofxyezhwpfxbecrxd.supabase.co';
const CONFIG='investlab_shared_data_connection_v1';
// This key is public by design; secret and service_role keys are never included.
const PUBLIC_KEY='sb_publishable_qi06fNVX2hpFCj0Ho8Wg_w_FBS_Z7YL';
const AUTH_STORAGE='investlab_shared_data_auth_v1';
const $=id=>document.getElementById(id);
const validKey=key=>typeof key==='string'&&key.length>20&&!key.startsWith('sb_secret_')&&!key.toLowerCase().includes('service_role');
let client=null;
function readConfig(){try{return JSON.parse(localStorage.getItem(CONFIG)||'{}');}catch{return {};}}
function getClient(key){
 if(!window.supabase?.createClient)throw Error('로그인 라이브러리를 불러오지 못했습니다.');
 if(!validKey(key))throw Error('TEST 공개용 연결 키가 필요합니다.');
 return window.supabase.createClient(TEST_URL,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:AUTH_STORAGE}});
}
function renderAuth(user){
 $('homeLoginForm').hidden=!!user;
 $('homeKeyDetails').hidden=!!user;
 $('homeLoggedIn').hidden=!user;
 if(user)$('homeWelcome').textContent='로그인됨 · '+(user.email||'TEST 사용자')+' · 모든 모듈에서 이용할 수 있습니다.';
}
async function refreshLogin(){
 const cfg=readConfig();
 try{
  const key=cfg.url===TEST_URL&&validKey(cfg.key)?cfg.key:PUBLIC_KEY;
  client=getClient(key);
  if(cfg.url!==TEST_URL||cfg.key!==key)localStorage.setItem(CONFIG,JSON.stringify({url:TEST_URL,key}));
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user){renderAuth(null);$('homeAuthStatus').textContent='계정 로그인이 필요합니다.';return;}
  renderAuth(data.user);$('homeAuthStatus').textContent='로그인 상태 확인 완료 · 개인 투자자료를 사용할 수 있습니다.';
 }catch(error){renderAuth(null);$('homeAuthStatus').textContent='로그인 확인 오류: '+error.message;}
}
$('homeLoginForm').addEventListener('submit',async event=>{
 event.preventDefault();const button=$('homeLoginButton');button.disabled=true;
 try{
  const cfg=readConfig(),entered=$('homePublicKey').value.trim(),key=entered||(cfg.url===TEST_URL&&validKey(cfg.key)?cfg.key:PUBLIC_KEY);
  if(!validKey(key))throw Error('최초 이용 시 공개용 연결 키를 입력하세요.');
  client=getClient(key);
  const {data,error}=await client.auth.signInWithPassword({email:$('homeEmail').value.trim(),password:$('homePassword').value});
  if(error||!data?.user?.id)throw error||Error('로그인 응답 오류');
  const {data:verified,error:verifyError}=await client.auth.getUser();
  if(verifyError||verified?.user?.id!==data.user.id)throw Error('서버에서 로그인 계정을 확인하지 못했습니다.');
  localStorage.setItem(CONFIG,JSON.stringify({url:TEST_URL,key}));
  $('homePassword').value='';$('homePublicKey').value='';renderAuth(data.user);
  $('homeAuthStatus').textContent='로그인 성공 · 계좌·매매 기록 관리에서 거래를 입력하세요.';
 }catch(error){$('homeAuthStatus').textContent='로그인 실패: '+error.message;}
 finally{button.disabled=false;}
});
$('homeLogout').addEventListener('click',async()=>{
 const button=$('homeLogout');button.disabled=true;
 try{
  if(client){const {error}=await client.auth.signOut();if(error)throw error;}
  renderAuth(null);$('homePassword').value='';$('homeAuthStatus').textContent='로그아웃했습니다. 기존 TEST 자료는 서버에 유지됩니다.';
 }catch(error){$('homeAuthStatus').textContent='로그아웃 실패: '+error.message;}
 finally{button.disabled=false;}
});
window.addEventListener('pageshow',()=>{void refreshLogin();});
void refreshLogin();
