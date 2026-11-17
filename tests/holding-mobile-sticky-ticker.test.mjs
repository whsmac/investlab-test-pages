import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../test-my-portfolio-ledger.html',import.meta.url),'utf8');
test('ticker remains visible during horizontal mobile scroll',()=>{assert.match(html,/\.holding-table-scroll th:nth-child\(2\),\.holding-table-scroll td:nth-child\(2\)\{position:sticky;left:48px/);assert.match(html,/\.holding-table-scroll th:nth-child\(2\)\{z-index:3\}/);assert.match(html,/aria-label="보유종목 평가 표" tabindex="0"/);});
test('horizontal columns stay readable',()=>{assert.match(html,/\.holding-table-scroll th,\.holding-table-scroll td\{white-space:nowrap;font-variant-numeric:tabular-nums\}/);assert.match(html,/overflow-x:auto/);});
test('inline page module syntax',()=>{const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(js);const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});assert.equal(r.status,0,r.stderr);});

test('sticky ticker column has a bounded width and cannot cover the next value column',()=>{
 assert.match(html,/\.holding-table-scroll th:nth-child\(2\),\.holding-table-scroll td:nth-child\(2\)\{[^}]*left:48px;[^}]*min-width:104px;width:104px;max-width:104px;overflow:hidden;text-overflow:ellipsis\}/);
 assert.match(html,/\.holding-table-scroll \.holding-pick\{[^}]*max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
 assert.match(html,/\.holding-table-scroll th:first-child,\.holding-table-scroll td:first-child\{[^}]*min-width:48px;width:48px\}/);
});
