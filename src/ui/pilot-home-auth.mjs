import {saveSharedQuoteKey,removeSharedQuoteKey} from '../market/pilot-shared-personal-quotes.mjs';
// HOME sign-in reuses the TEST Supabase session and public-key configuration used by all modules.
const TEST_URL='https://gopofxyezhwpfxbecrxd.supabase.co';
const CONFIG='investlab_shared_data_connection_v1';
// This key is public by design; secret and service_role keys are never included.
const PUBLIC_KEY='sb_publishable_qi06fNVX2hpFCj0Ho8Wg_w_FBS_Z7YL';
const AUTH_STORAGE='investlab_shared_data_auth_v1';
const $=id=>document.getElementById(id);
const validKey=key=>typeof key==='string'&&key.length>20&&!key.startsWith('sb_secret_')&&!key.toLowerCase().includes('service_role');
let client=null,quoteOwner=null,quoteGeneration=0,quoteBusy=false;
function readConfig(){try{return JSON.parse(localStorage.getItem(CONFIG)||'{}');}catch{return {};}}
function getClient(key){
 if(!window.supabase?.createClient)throw Error('로그인 라이브러리를 불러오지 못했습니다.');
 if(!validKey(key))throw Error('TEST 공개용 연결 키가 필요합니다.');
 return window.supabase.createClient(TEST_URL,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:AUTH_STORAGE}});
}
function clearQuoteForm(){ $('homeQuoteKey').value='';$('homeQuoteConsent').checked=false; }
function renderQuoteControls(connected){$('homeQuoteSave').disabled=quoteBusy||!quoteOwner;$('homeQuoteRemove').disabled=quoteBusy||!quoteOwner||!connected;}
async function refreshQuoteSettings(userId,c=client){const n=++quoteGeneration;quoteOwner=userId;quoteBusy=true;clearQuoteForm();$('homeQuoteSettings').hidden=!userId;renderQuoteControls(false);if(!userId){quoteBusy=false;$('homeQuoteDetails').open=false;$('homeQuoteStatus').textContent='로그인 후 설정';return;}try{const a=await c.auth.getUser();if(a.error||a.data?.user?.id!==userId)throw Error('로그인 확인 필요');const r=await c.from('investlab_personal_quote_settings').select('user_id').eq('user_id',userId).maybeSingle();const b=await c.auth.getUser();if(n!==quoteGeneration)return;if(r.error||b.error||b.data?.user?.id!==userId)throw Error('시세 설정 확인 실패');const connected=!!r.data;quoteBusy=false;$('homeQuoteStatus').textContent=connected?'공통 시세 연결 등록됨 · 실제 최신 시세는 각 모듈에서 확인':'공통 시세 미등록 · 아래 API 키를 등록하세요';$('homeQuoteDetails').open=!connected;renderQuoteControls(connected);}catch{if(n===quoteGeneration){quoteBusy=false;$('homeQuoteStatus').textContent='시세 설정 조회 실패 · 새로고침 후 다시 확인';renderQuoteControls(false);}}}
$('homeQuoteSave').onclick=async()=>{const id=quoteOwner,c=client,n=quoteGeneration,key=$('homeQuoteKey').value.trim();if(!id||quoteBusy)return;if(!$('homeQuoteConsent').checked||!(/^[A-Za-z0-9_-]{10,128}$/.test(key))){$('homeQuoteStatus').textContent='API 키와 이용 동의를 확인하세요.';return;}quoteBusy=true;renderQuoteControls(false);clearQuoteForm();try{await saveSharedQuoteKey(c,id,key);if(n!==quoteGeneration)return;await refreshQuoteSettings(id,c);if(quoteOwner===id&&$('homeQuoteStatus').textContent.startsWith('공통 시세 연결 등록됨'))$('homeQuoteStatus').textContent='공통 시세 연결 저장 완료 · 내 투자현황에서 시세 확인';}catch{if(n===quoteGeneration){quoteBusy=false;$('homeQuoteStatus').textContent='저장 실패 · API 키와 서버 연결을 확인하세요.';renderQuoteControls(false);}}};
$('homeQuoteRemove').onclick=async()=>{const id=quoteOwner,c=client,n=quoteGeneration;if(!id||quoteBusy||!confirm('동일 계정의 모든 기기에서 공통 시세 연결을 삭제할까요?'))return;quoteBusy=true;renderQuoteControls(false);try{await removeSharedQuoteKey(c,id);if(n===quoteGeneration)await refreshQuoteSettings(id,c);}catch{if(n===quoteGeneration){quoteBusy=false;$('homeQuoteStatus').textContent='삭제 실패 · 새로고침 후 다시 확인';renderQuoteControls(true);}}};
function renderAuth(user){void refreshQuoteSettings(user?.id||null);
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
// Park the active account's local draft before signing out, so a later visitor
// cannot see it through the shared browser's unscoped ledger slot.
function parkCurrentUserLedger(userId){
 const key='investlab_pilot_ledger_local_v1',ownerKey='investlab_pilot_ledger_local_owner_v1';
 const owner=localStorage.getItem(ownerKey),raw=localStorage.getItem(key);
 if(owner!==userId)return; // Never act on a different user's local record.
 if(raw!==null){
  const archive=key+':'+userId;
  const before=localStorage.getItem(archive);
  try{
   localStorage.setItem(archive,raw);
   if(localStorage.getItem(archive)!==raw)throw Error('로그아웃 보관 확인 실패');
   localStorage.removeItem(key);
   localStorage.removeItem(ownerKey);
  }catch(error){
   if(before===null)localStorage.removeItem(archive);else localStorage.setItem(archive,before);
   throw error;
  }
 }else localStorage.removeItem(ownerKey);
}
$('homeLogout').addEventListener('click',async()=>{
 const button=$('homeLogout');button.disabled=true;
 try{
  if(client){
   const {data:current,error:userError}=await client.auth.getUser();
   if(userError||!current?.user?.id)throw Error('로그아웃 전 계정을 확인할 수 없습니다.');
   parkCurrentUserLedger(current.user.id);
   const {error}=await client.auth.signOut();if(error)throw error;
  }
  renderAuth(null);$('homePassword').value='';$('homeAuthStatus').textContent='로그아웃했습니다. 기존 TEST 자료는 서버에 유지됩니다.';
 }catch(error){$('homeAuthStatus').textContent='로그아웃 실패: '+error.message;}
 finally{button.disabled=false;}
});
window.addEventListener('pageshow',()=>{void refreshLogin();});
window.addEventListener('storage',e=>{if([AUTH_STORAGE,CONFIG].includes(e.key)){void refreshQuoteSettings(null);void refreshLogin();}});
window.addEventListener('pagehide',()=>{++quoteGeneration;clearQuoteForm();$('homeQuoteSettings').hidden=true;});
void refreshLogin();
