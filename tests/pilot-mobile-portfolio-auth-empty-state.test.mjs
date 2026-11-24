import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../my-portfolio.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if(!script)throw Error('My Portfolio module missing');
const elements=new Map(['portfolioAccess','portfolioAccessTitle','portfolioAccessStatus',
 'portfolioPrivate','cloudLedgerStatus','portfolioSyncBanner'].map(id=>
 [id,{hidden:id==='portfolioPrivate',textContent:''}]));
const $=id=>{if(!elements.has(id))throw Error('Unexpected element '+id);return elements.get(id);};
const accessCode=script.slice(script.indexOf('function setPortfolioAccessState('),script.indexOf('function refreshAccountOptions()'));
const access=new Function('$',accessCode+';return setPortfolioAccessState;')($);

test('mobile direct-link page has a public login explanation before any private data',()=>{
 assert.ok(html.indexOf('id="portfolioAccess"')<html.indexOf('id="portfolioPrivate"'));
 assert.ok(html.indexOf('id="portfolioAccess"')<html.indexOf('hidden><p class="muted portfolio-head"'));
 assert.match(html,/id="portfolioLoginLink"[^>]*href|href="\.\/index\.html#login" id="portfolioLoginLink"/);
 assert.match(html,/id="portfolioRetry"/);
 assert.match(html,/휴대폰·회사 PC·집 PC/);
 assert.match(html,/<div id="portfolioPrivate" hidden>/);
 assert.match(html,/id="portfolioAccessStatus"/);
});
test('login and connection guidance always visible to unauthenticated mobile user',()=>{
 access('checking','checking on first load');assert.equal($('portfolioAccess').hidden,false);
 access('configuration','connect via home');assert.equal($('portfolioAccess').hidden,false);
 assert.equal($('portfolioAccessStatus').textContent,'connect via home');
 access('login','login required');assert.equal($('portfolioAccess').hidden,false);
 assert.match($('portfolioAccessTitle').textContent,/로그인/);
});
test('authenticated portfolio hides public login instructions without disclosing private data',()=>{
 access('ready','');
 assert.equal($('portfolioAccess').hidden,true);
 access('error','read failed');
 assert.equal($('portfolioAccess').hidden,false);
});
test('initial refresh occurs even if iOS does not emit pageshow; storage/focus remain reactive',()=>{
 assert.match(script,/void refreshOnlineLedgerDisplay\(\);\s*<\/script>|void refreshOnlineLedgerDisplay\(\);\s*$/);
 assert.match(script,/window\.addEventListener\('pageshow'/);
 assert.match(script,/window\.addEventListener\('focus'/);
 assert.match(script,/visibilitychange/);
 assert.match(script,/portfolioRetry'\)\.addEventListener\('click'/);
});
test('mobile without TEST browser setup never reads a private ledger and shows login route',async()=>{
 const begin=script.indexOf('async function refreshOnlineLedgerDisplay(){');
 const end=script.indexOf("$('portfolioRetry').addEventListener",begin);
 assert.ok(begin>0&&end>begin);
 const source=script.slice(begin,end);
 let resets=0;
 const localStorage={getItem:()=>null};
 const window={supabase:{createClient:()=>{throw Error('Should not contact backend for no configuration');}}};
 const state=[];
 const mark=(name,message)=>state.push({name,message});
 const fn=new Function('$','localStorage','window','resetVisiblePortfolio','setPortfolioAccessState',
  'let cloudLedgerBusy=false;\n'+source+'\nreturn refreshOnlineLedgerDisplay;')(
  $,localStorage,window,()=>{resets++;},mark);
 await fn();
 assert.equal(resets,1);
 assert.ok(state.some(x=>x.name==='configuration'));
 assert.match($('cloudLedgerStatus').textContent,/TEST 계정 미연결/);
 assert.equal($('portfolioPrivate').hidden,true);
 assert.match($('portfolioSyncBanner').textContent,/TEST 계정 미연결/);
});
test('mobile without a valid Supabase session does not display previous user account holdings',async()=>{
 const begin=script.indexOf('async function refreshOnlineLedgerDisplay(){');
 const end=script.indexOf("$('portfolioRetry').addEventListener",begin);
 const source=script.slice(begin,end);
 const cfg={url:'https://gopofxyezhwpfxbecrxd.supabase.co',key:'sb_publishable_public_test_key'};
 const store={getItem:key=>key==='investlab_shared_data_connection_v1'?JSON.stringify(cfg):null};
 const window={supabase:{createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})}};
 let resets=0;const flags=[];
 const fn=new Function('$','localStorage','window','resetVisiblePortfolio','setPortfolioAccessState',
  'let cloudLedgerBusy=false;\n'+source+'\nreturn refreshOnlineLedgerDisplay;')(
  $,store,window,()=>{resets++;},(s,m)=>flags.push({s,m}));
 await fn();
 assert.equal(resets,1);
 assert.ok(flags.some(x=>x.s==='login'));
 assert.match($('cloudLedgerStatus').textContent,/로그인이 필요/);
 assert.equal($('portfolioPrivate').hidden,true);
});
test('inline script is valid ES module and no service-role key is embedded',()=>{
 const check=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 assert.doesNotMatch(html,/sb_secret_[A-Za-z0-9]{8,}/);
 assert.doesNotMatch(html,/sb_service_role_/);
});
