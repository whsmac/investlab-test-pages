import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const html=readFileSync(new URL('../test-portfolio-account-allocation.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
test('opening review page contains executable module with valid JavaScript syntax',()=>{assert.ok(script);const stripped=script.replace(/^import .*;$/gm,'');execFileSync(process.execPath,['--check','--input-type=module'],{input:stripped})});
test('review result is invalidated when advanced JSON changes',()=>{assert.match(script,/addEventListener\('input',invalidate\)/);assert.match(script,/reviewFingerprint!==fingerprint\(\)/)});
test('unapplied table changes block both review actions',()=>{assert.match(script,/\$\('run'\)\.onclick=\(\)=>\{if\(dirty\)/);assert.match(script,/\$\('handoff'\)\.onclick=\(\)=>\{if\(dirty\)/)});
test('unsaved table edits block rebuild',()=>assert.match(script,/if\(formState&&dirty\)throw Error/));
test('no Supabase write, fetch, or database client in review page',()=>{assert.doesNotMatch(script,/\bfetch\s*\(|\.from\s*\(|\.rpc\s*\(/)});

test('review page has five ordered user steps and scrollable result tables',()=>{for(const label of ['1. 보유종목 파일과 계좌 등록','2. 계좌별 수량·원가·현금 입력','3. 검증 및 결과 저장','4. 이전 검토 결과 비교','5. 계좌별 검증 결과'])assert.ok(html.includes(label));assert.match(html,/id="compareChanges" style="overflow-x:auto"/)});
test('saved review comparison table renders both loop closures before updating DOM',()=>{assert.match(script,/for\(const d of comparison\.details\)[\s\S]*?tr\.style\.backgroundColor='#fff5e6'\}\}\$\('compareChanges'\)/)});

test('multi-account holdings are never assigned to first account by default',()=>{assert.match(script,/accounts\.length===1\?source\.holdings\.map/);assert.match(script,/accounts\.length>1/);assert.match(script,/if\(!mapped\.allocations\.length\)throw Error/)});

test('account readiness can filter unresolved rows and focus source controls',()=>{assert.match(html,/id="onlyPendingReadiness"/);assert.match(script,/onlyPendingReadiness'\)\.checked/);assert.match(script,/jump\.onclick=/);assert.match(script,/target\?\.focus\(\)/);assert.match(script,/ownerControls\.find/);assert.match(script,/costConfirmed/)});

test('one-click review applies table then reconciles and checks final readiness without server writes',()=>{assert.match(html,/id="reviewAll"/);assert.match(script,/reviewAll'\)\.onclick/);assert.match(script,/applyTable'\)\.click\(\)/);assert.match(script,/handoff'\)\.click\(\)/);assert.match(script,/finalReview'\)\.click\(\)/);assert.match(script,/OFFLINE_OPENING_RECONCILED_NOT_SERVER_VERIFIED/);assert.match(script,/if\(formState&&dirty\)throw Error\('미반영 표 변경사항이 있습니다/);});

test('browser smoke test guide is linked and steps are numbered in order',()=>{assert.match(html,/docs\/offline-browser-smoke-test\.md/);for(const n of [1,2,3,4,5])assert.match(html,new RegExp('<h2>'+n+'\\. '));});

test('browser smoke sample requires confirmation and refuses unsaved edits',()=>{assert.match(html,/id="loadSmokeSample"/);assert.match(script,/loadSmokeSample'\)\.onclick/);assert.match(script,/window\.confirm\(/);assert.match(script,/if\(formState&&dirty\)/);assert.match(script,/\$\('sample'\)\.click\(\)/);assert.match(script,/\$\('makeTable'\)\.click\(\)/)});

test('review pair UI hashes both uploaded files and never claims server authorization',()=>{assert.match(script,/crypto\.subtle\.digest\('SHA-256',bytes\)/);assert.match(script,/createReviewTargetLink\(/);assert.match(script,/validateReviewTargetLink\(/);assert.match(script,/confirmReviewPair/);assert.match(html,/id="previousReviewPair"/);assert.match(html,/id="saveReviewPair"/)});
test('review pair rejects invalid source evidence and requires explicit confirmation',()=>{assert.match(script,/result\.checks\[0\]\.status==='INVALID'/);assert.match(script,/if\(!\$\('confirmReviewPair'\)\.checked\)throw Error/)});
