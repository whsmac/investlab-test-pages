import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('inline module parses',()=>{const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(script);const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});assert.equal(result.status,0,result.stderr);});
test('all review control IDs are unique',()=>{const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);});
test('mobile review has collapsed secondary tools',()=>{assert.match(html,/<summary>검토 보고서 저장·불러오기<\/summary>/);assert.match(html,/<summary>계좌별 수량 비교 상세표<\/summary>/);assert.match(html,/\.action-row\{/);});

test('holdings are presented before optional review tools',()=>{const holdings=html.indexOf('id="portfolio-holdings"');const tools=html.indexOf('id="portfolio-tools"');assert.ok(holdings>0&&tools>holdings);assert.match(html,/<details class="portfolio-tools" id="portfolio-tools"><summary>데이터 연결·검토 도구 펼치기<\/summary>/);assert.match(html,/href="#portfolio-holdings"/);assert.match(html,/href="#portfolio-tools"/);});
test('existing functional controls survive reordering',()=>{for(const id of ['ledger-load','legacy-review','allocation-check','split-check','split-save','split-notes-restore','account','holdings','cash'])assert.ok(html.includes('id="'+id+'"'),id);});
