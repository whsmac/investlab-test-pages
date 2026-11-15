import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('one assumed price source synchronizes ticker detail and portfolio rows',()=>{
 assert.match(html,/function getAssumedPrice\(ticker\)/);
 assert.match(html,/function setAssumedPrice\(ticker,value\)/);
 assert.match(html,/holding-assumed-price'\)\.value=getAssumedPrice\(data\.ticker\)/);
 assert.match(html,/input\.value=getAssumedPrice\(h\.ticker\)/);
 assert.match(html,/setAssumedPrice\(ticker,el\('holding-assumed-price'\)\.value\)/);
});
test('editing either price view invalidates old valuation',()=>{
 assert.match(html,/function markValuationStale\(/);
 assert.match(html,/portfolio-price-rows'\)\.addEventListener\('input',event/);
 assert.match(html,/markValuationStale\(\)/);
});
test('browser module syntax',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(result.status,0,result.stderr);});
