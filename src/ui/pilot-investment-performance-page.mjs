import {firstLedgerDay,validDay} from '../ledger/pilot-portfolio-history.mjs';
import {projectLedger} from '../ledger/pilot-portfolio-projection.mjs';
import {resolveVerifiedPilotLedger,cloudLedgerBaselineKey,TEST_LEDGER_KEY,TEST_LEDGER_OWNER_KEY} from '../ledger/pilot-ledger-readonly-consistency.mjs';
import {loadPortfolioHistoryMarket,renderPortfolioHistory} from './pilot-portfolio-history-ui.mjs';
import {clearVisualPerformance,stopVisualPlayback} from './pilot-visual-performance-ui.mjs';
const $=id=>document.getElementById(id),TEST_URL='https://gopofxyezhwpfxbecrxd.supabase.co';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
let data=null,owner=null,revision=null,market=null,marketLoad=null,generation=0,authGeneration=0,busy=false,queued=false;
function clear(){generation++;data=null;owner=null;revision=null;$('portfolioPrivate').hidden=true;clearVisualPerformance();for(const id of ['historyTrades','historyDrawdown','historyTradePrices','historyQuantities','historyFx','historyTradeTicker','visualAccount'])$(id).replaceChildren();$('historyStart').value='';$('historyEnd').value='';}
function access(message){$('portfolioAccess').hidden=false;$('portfolioAccessTitle').textContent='TEST 계정 연결 확인';$('portfolioAccessStatus').textContent=message;}
function accounts(){const sel=$('visualAccount'),previous=sel.value;sel.replaceChildren(new Option('전체 계좌','ALL'));for(const a of data.accounts)sel.append(new Option(a.name,a.id));sel.value=[...sel.options].some(o=>o.value===previous)?previous:'ALL';}
function dates(reset=false){const end=today(),first=firstLedgerDay(data,$('visualAccount').value),ytd=end.slice(0,4)+'-01-01';for(const id of ['historyStart','historyEnd']){$(id).max=end;$(id).min=first||'';}if(reset||!$('historyStart').value||first&&$('historyStart').value<first)$('historyStart').value=first&&first>ytd?first:ytd;if(reset||!$('historyEnd').value)$('historyEnd').value=end;}
async function query(){if(!data||!owner||$('portfolioPrivate').hidden)return;const start=$('historyStart').value,end=$('historyEnd').value,selected=$('visualAccount').value,currency=$('visualCurrency').value,g=++generation,verified=owner;stopVisualPlayback();if(!validDay(start)||!validDay(end)||start>end||end>today()){ $('historyStatus').textContent='유효한 시작일·종료일을 선택하세요.';return;}try{$('historyStatus').textContent='기간 자료 확인 중…';if(!market){if(!marketLoad)marketLoad=loadPortfolioHistoryMarket().finally(()=>{marketLoad=null;});market=await marketLoad;}if(g!==generation||verified!==owner||!data)return;renderPortfolioHistory(data,market,start,end,selected,currency);}catch(e){if(g===generation){clearVisualPerformance();$('historyStatus').textContent=String(e.message||e);}}}
async function refresh(){if(busy){queued=true;return;}busy=true;const g=++authGeneration;try{
 const cfg=JSON.parse(localStorage.getItem('investlab_shared_data_connection_v1')||'{}');
 if(cfg.url!==TEST_URL||typeof cfg.key!=='string'||!cfg.key||cfg.key.startsWith('sb_secret_')||cfg.key.toLowerCase().includes('service_role')){clear();access('TEST 홈에서 같은 계정으로 로그인하세요.');return;}
 if(!window.supabase?.createClient)throw Error('Supabase 라이브러리 로딩 실패');
 const client=window.supabase.createClient(TEST_URL,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'investlab_shared_data_auth_v1'}});
 const {data:auth,error:authError}=await client.auth.getUser();if(g!==authGeneration)return;
 if(authError||!auth?.user?.id){clear();access('TEST 홈에서 로그인해 주세요.');return;}
 const id=auth.user.id;if(owner&&owner!==id)clear();
 const {data:remote,error}=await client.from('investlab_pilot_ledger_documents').select('payload,updated_at').eq('user_id',id).maybeSingle();if(error)throw error;
 const {data:check,error:checkError}=await client.auth.getUser();if(g!==authGeneration)return;if(checkError||check?.user?.id!==id)throw Error('조회 도중 로그인 계정 변경');
 const localOwner=localStorage.getItem(TEST_LEDGER_OWNER_KEY),localRaw=localOwner===id?localStorage.getItem(TEST_LEDGER_KEY):localStorage.getItem(TEST_LEDGER_KEY+':'+id);
 const result=resolveVerifiedPilotLedger({userId:id,remote,localOwnerId:localOwner,localRaw,baselineRaw:localStorage.getItem(cloudLedgerBaselineKey(id))});
 if(!result.payload){clear();access(result.notice);return;}
 projectLedger(result.payload,'ALL');for(const a of result.payload.accounts)projectLedger(result.payload,a.id);
 const changed=owner!==id||revision!==result.revision,first=owner!==id;
 data=result.payload;owner=id;revision=result.revision;$('portfolioSyncBanner').textContent=result.notice;$('portfolioAccess').hidden=true;$('portfolioPrivate').hidden=false;
 if(changed){accounts();dates(first);await query();}
 }catch(e){if(g===authGeneration){clear();access('투자성과 조회 실패 · '+String(e.message||e)+' · 다시 연결하거나 홈에서 로그인하세요.');}}
 finally{busy=false;if(queued){queued=false;void refresh();}}}
$('portfolioRetry').onclick=()=>void refresh();
$('historyQuery').onclick=()=>void query();
$('visualAccount').onchange=()=>{if(data){dates();void query();}};
$('visualCurrency').onchange=()=>void query();
$('historyPresets').onclick=e=>{if(!data)return;const days=Number(e.target.dataset.days),ytd=e.target.dataset.period==='ytd';if(!days&&!ytd)return;const end=today(),first=firstLedgerDay(data,$('visualAccount').value),start=ytd?end.slice(0,4)+'-01-01':new Date(Date.parse(end+'T00:00:00Z')-days*86400000).toISOString().slice(0,10);$('historyStart').value=first&&first>start?first:start;$('historyEnd').value=end;void query();};
window.addEventListener('storage',e=>{if(e.key==='investlab_shared_data_auth_v1'||e.key==='investlab_shared_data_connection_v1'||e.key===null){authGeneration++;clear();access('계정 연결 확인 중…');}if(e.key===null||[TEST_LEDGER_KEY,TEST_LEDGER_OWNER_KEY,'investlab_shared_data_auth_v1','investlab_shared_data_connection_v1'].includes(e.key)||e.key?.startsWith('investlab_pilot_ledger_cloud_base_v1:'))void refresh();});
window.addEventListener('pageshow',()=>void refresh());window.addEventListener('focus',()=>void refresh());window.addEventListener('pagehide',()=>{stopVisualPlayback();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});setInterval(()=>{if(!document.hidden)void refresh();},15*60*1000);void refresh();
