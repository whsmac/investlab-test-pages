import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const html=readFileSync(new URL('../test-portfolio-account-allocation.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
test('opening review page contains executable module with valid JavaScript syntax',()=>{assert.ok(script);const stripped=script.replace(/^import .*;$/gm,'');execFileSync(process.execPath,['--check','--input-type=module'],{input:stripped})});
test('review result is invalidated when advanced JSON changes',()=>{assert.match(script,/addEventListener\('input',invalidate\)/);assert.match(script,/reviewFingerprint!==fingerprint\(\)/)});
test('unapplied table changes block both review actions',()=>{assert.match(script,/\$\('run'\)\.onclick=\(\)=>\{if\(dirty\)/);assert.match(script,/\$\('handoff'\)\.onclick=\(\)=>\{if\(dirty\)/)});
test('unsaved table edits block rebuild',()=>assert.match(script,/if\(formState&&dirty\)throw Error/));
test('no Supabase write, fetch, or database client in review page',()=>{assert.doesNotMatch(script,/\bfetch\s*\(|\.from\s*\(|\.rpc\s*\(/)});

test('review page has five ordered user steps and scrollable result tables',()=>{for(const label of ['1. 보유종목 파일과 계좌 등록','2. 계좌별 수량·원가·현금 입력','3. 검증 및 결과 저장','4. 계좌별 검증 결과','5. 이전 검토 결과 비교'])assert.ok(html.includes(label));assert.match(html,/id="compareChanges" style="overflow-x:auto"/)});
test('saved review comparison table renders both loop closures before updating DOM',()=>{assert.match(script,/for\(const d of comparison\.details\)[\s\S]*?tr\.style\.backgroundColor='#fff5e6'\}\}\$\('compareChanges'\)/)});
