import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('rebuild preserves edits only when account ticker and quantity match',()=>{assert.match(html,/previous\.get\(account\.accountId\+'\|'\+holding\.ticker\)/);assert.match(html,/prior\.quantity===holding\.quantityDisplay/);});
test('browser restoration revalidates against current ledger',()=>{assert.match(html,/restoreAccountCostReport\(\{accounts:v\.accounts,entries,savedReport:JSON\.parse\(raw\)\}\)/);assert.match(html,/기존 보관 단가 불일치/);});
test('module syntax',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(result.status,0,result.stderr);});
