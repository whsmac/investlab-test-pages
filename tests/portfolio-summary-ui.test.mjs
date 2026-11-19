import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('summary only shows calculated hypothetical totals',()=>{assert.match(html,/id="portfolio-valuation-summary"/);assert.match(html,/result\.totalMarketValueUsd/);assert.match(html,/result\.totalUnrealizedPnlUsd/);assert.match(html,/실시간 시세 아님/);});
test('changed inputs invalidate displayed summary',()=>{assert.match(html,/portfolio-price-rows'\)\.addEventListener\('input'/);assert.match(html,/cost-review-rows'\)\.addEventListener\('input'/);});
test('inline script parses',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(r.status,0,r.stderr);});
