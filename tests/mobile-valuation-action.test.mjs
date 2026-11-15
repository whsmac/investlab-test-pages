import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('one calculate button next to holdings',()=>{assert.equal((html.match(/id="portfolio-price-calc"/g)||[]).length,1);assert.match(html,/<tbody id="holdings"><\/tbody><\/table><\/div><div class="valuation-calc-actions"><button id="portfolio-price-calc"/);});
test('mobile calculation action stays reachable',()=>{assert.match(html,/@media\(max-width:640px\)\{\.valuation-calc-actions\{position:sticky;bottom:8px/);assert.match(html,/\.valuation-calc-actions button\{width:100%\}/);});
test('browser module syntax',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(r.status,0,r.stderr);});
