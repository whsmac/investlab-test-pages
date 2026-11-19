import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('selected holding displays account cost editor',()=>{assert.match(html,/renderHoldingCostEditor\(data\)/);assert.match(html,/data\.accounts\.some\(a=>a\.accountId===row\.dataset\.accountId\)/);assert.match(html,/row\.querySelector\('input'\)\.value=input\.value/);});
test('review table changes refresh selected holding',()=>{assert.match(html,/cost-review-rows'\)\.addEventListener\('input'/);assert.match(html,/showHoldingDetail\(ticker\)/);});
test('page script syntax',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(r.status,0,r.stderr);});
