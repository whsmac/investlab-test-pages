import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('complete status confirms no missing inputs and is explicitly hypothetical',()=>{assert.match(html,/누락 항목 없음/);assert.match(html,/실시간 시세·서버 검증 결과는 아닙니다/);assert.match(html,/root\.dataset\.state=completion\.fullyCalculated\?'complete'/);});
test('partial, stale and error states are distinguishable',()=>{assert.match(html,/입력 확인 필요/);assert.match(html,/전체 평가손익·수익률은 모든 입력이 완료되기 전까지 미확정/);assert.match(html,/dataset\.state='stale'/);assert.match(html,/dataset\.state='error'/);});
test('browser module parses',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(r.status,0,r.stderr);});
