import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('ranking column is conditional on computed valuation',()=>{assert.match(html,/<th scope="col">순위<\/th><th>종목<\/th>/);assert.match(html,/valuationSort&&lastPortfolioValuation\?String/);assert.match(html,/rankCell\.setAttribute\('aria-label'/);});
test('sort status tells users whether valuation ranking is applied',()=>{assert.match(html,/정렬 대기: 가정 평가 계산 후 적용/);assert.match(html,/미계산 종목은 뒤쪽/);assert.match(html,/순위 미적용/);});
test('stale valuation resets ranking and leaves inputs intact',()=>{assert.match(html,/row\.cells\[0\]\.textContent='—'/);assert.match(html,/\.slice\(5\)\)cell\.textContent='미계산'/);});
test('browser module parses',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(r.status,0,r.stderr);});
